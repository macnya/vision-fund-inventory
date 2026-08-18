const Groq = require('groq-sdk');
const pool = require('../db/pool');
const { branchScopeFor } = require('../utils/scope');
const { ROLES, canonicalRole } = require('../middleware/authMiddleware');

// POST /assistant — a natural-language front door to the register.
//
// WHY THIS LIVES IN THE BACKEND
// The Slack bot answered the same questions with its own copy of the queries,
// its own scope handling and its own way of working out who was asking. Adding
// a third copy for the admin panel and a fourth for the scanner is how a system
// starts contradicting itself — which is exactly what happened to asset.status
// and the custody records.
//
// Here, verifyToken has already established who the caller is, what role they
// hold and which branch they are scoped to. The assistant inherits all of it.
//
// THE MODEL NEVER TOUCHES THE DATABASE. It receives the result of a query and
// turns it into a sentence. It cannot write SQL, cannot choose a table, and
// cannot see anything the caller's own role would not already show them. A
// prompt-injection attempt reaches a summariser, not a query planner.

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Retired models 404 at runtime rather than at build time, so this is
// configurable without a code change.
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

const SYSTEM_PROMPT = `You are the VisionFund Kenya asset register assistant.

You are given DATA retrieved from the register and a QUESTION. Answer only from
the DATA. Be brief — two or three sentences.

If the DATA says nothing was found, say so plainly and suggest what to try
instead. Never invent an asset, a figure, a policy or a person's name. Never
guess at a number. If the DATA is empty, say you could not find it rather than
offering a general answer, because a plausible wrong answer about company
property is worse than no answer.

Amounts are Kenyan shillings. Write them as "KES 1,234".`;

// ---------------------------------------------------------------------------
// Retrieval. Each of these applies the caller's branch scope, so an answer can
// never contain more than the panel would show the same person.
// ---------------------------------------------------------------------------

// Branch names are matched against the register rather than parsed out of the
// question. Nothing the user types reaches a query as an identifier.
let branchCache = null;
let branchCacheExpiry = 0;

async function knownBranches() {
  if (branchCache && Date.now() < branchCacheExpiry) return branchCache;
  const { rows } = await pool.query(
    `SELECT DISTINCT branch FROM location WHERE branch IS NOT NULL AND branch <> ''`
  );
  branchCache = rows.map((r) => r.branch);
  branchCacheExpiry = Date.now() + 10 * 60 * 1000;
  return branchCache;
}

async function findBranch(text) {
  const lower = text.toLowerCase();
  const branches = await knownBranches();
  // Longest match first, so "Eldoret East" is not mistaken for "Eldoret".
  return branches
    .slice()
    .sort((a, b) => b.length - a.length)
    .find((b) => lower.includes(b.toLowerCase())) || null;
}

async function assetByCode(text, scope) {
  const match = text.toUpperCase().match(/\b((?:VFK|KDT|NC|EQP|C&P|F&F|INT)[\s\-\/]?\d{3,6})\b/);
  if (!match) return null;
  const code = match[1].replace(/[\s\-]/g, '');

  const { rows } = await pool.query(
    `SELECT a.asset_code, a.description, a.status, a.condition, a.purchase_price,
            ac.name AS category, e.name AS holder,
            l.branch, l.department, l.physical_location
     FROM asset a
     LEFT JOIN asset_category ac ON ac.id = a.asset_category_id
     LEFT JOIN assignment ag ON ag.asset_id = a.id AND ag.returned_date IS NULL
     LEFT JOIN employee e ON e.id = ag.employee_id
     LEFT JOIN location l ON l.id = ag.location_id
     WHERE a.asset_code = $1
       AND a.approval_status = 'approved'
       AND ($2::text IS NULL OR l.branch = $2)`,
    [code, scope]
  );

  // "Not in the register" and "not at your branch" give the same answer.
  // Distinguishing them would let a scoped user map the register one code at a
  // time.
  return { code, asset: rows[0] || null };
}

async function branchSummary(branch, scope) {
  const { rows } = await pool.query(
    `SELECT COALESCE(ac.name, 'Uncategorised') AS category,
            COUNT(DISTINCT a.id)::int AS assets,
            COALESCE(SUM(a.purchase_price), 0)::numeric AS value
     FROM asset a
     JOIN assignment ag ON ag.asset_id = a.id AND ag.returned_date IS NULL
     JOIN location l ON l.id = ag.location_id
     LEFT JOIN asset_category ac ON ac.id = a.asset_category_id
     WHERE l.branch = $1
       AND a.approval_status = 'approved'
       AND ($2::text IS NULL OR l.branch = $2)
     GROUP BY ac.name
     ORDER BY assets DESC`,
    [branch, scope]
  );
  return rows;
}

// Employees are matched against the table for the same reason branches are.
// Two name parts minimum, and a tie refuses — there are several Graces, and
// answering about the wrong person's equipment is worse than asking.
async function findEmployee(text, scope) {
  const words = text.toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  if (words.length < 2) return null;

  const { rows } = await pool.query(
    `SELECT DISTINCT e.id, e.name, e.branch, e.department, e.employment_status
     FROM employee e
     LEFT JOIN assignment ag ON ag.employee_id = e.id AND ag.returned_date IS NULL
     LEFT JOIN location l ON l.id = ag.location_id
     WHERE e.name IS NOT NULL
       AND ($1::text IS NULL OR l.branch = $1 OR e.branch = $1)`,
    [scope]
  );

  const scored = rows
    .map((e) => {
      const parts = e.name.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
      return { e, hits: parts.filter((p) => words.includes(p)).length };
    })
    .filter((s) => s.hits >= 2)
    .sort((a, b) => b.hits - a.hits);

  if (!scored.length) return null;
  if (scored.length > 1 && scored[0].hits === scored[1].hits) {
    return { ambiguous: scored.slice(0, 4).map((s) => s.e.name) };
  }
  return { employee: scored[0].e };
}

async function employeeHoldings(employeeId, scope) {
  const { rows } = await pool.query(
    `SELECT a.asset_code, a.description, a.condition, a.purchase_price,
            ac.name AS category, l.branch
     FROM assignment ag
     JOIN asset a ON a.id = ag.asset_id
     LEFT JOIN asset_category ac ON ac.id = a.asset_category_id
     LEFT JOIN location l ON l.id = ag.location_id
     WHERE ag.employee_id = $1
       AND ag.returned_date IS NULL
       AND a.approval_status = 'approved'
       AND ($2::text IS NULL OR l.branch = $2)
     ORDER BY a.purchase_price DESC NULLS LAST`,
    [employeeId, scope]
  );
  return rows;
}

async function registerTotals(scope) {
  const { rows } = await pool.query(
    `SELECT a.status,
            COUNT(DISTINCT a.id)::int AS assets,
            COALESCE(SUM(a.purchase_price), 0)::numeric AS value
     FROM asset a
     LEFT JOIN assignment ag ON ag.asset_id = a.id AND ag.returned_date IS NULL
     LEFT JOIN location l ON l.id = ag.location_id
     WHERE a.approval_status = 'approved'
       AND ($1::text IS NULL OR l.branch = $1)
     GROUP BY a.status`,
    [scope]
  );
  return rows;
}

async function policyAnswer(question) {
  const terms = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter((t) => t.length > 2);
  if (!terms.length) return [];

  const { rows } = await pool.query(
    `SELECT question, answer FROM knowledge_base
     WHERE keywords && $1::text[]
        OR EXISTS (SELECT 1 FROM unnest($1::text[]) AS t
                   WHERE LOWER(question) LIKE '%' || t || '%')
     LIMIT 3`,
    [terms]
  );
  return rows;
}

// ---------------------------------------------------------------------------

const money = (v) =>
  v == null || Number(v) === 0
    ? 'no value recorded'
    : `KES ${Number(v).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

// Policy topics are checked BEFORE anything counting assets, because "how many
// days annual leave" contains "how many" and would otherwise be treated as a
// stock question and answered from an empty context.
const POLICY_WORDS = [
  'leave', 'holiday', 'maternity', 'paternity', 'sick', 'compassionate',
  'bereavement', 'remote', 'work from home', 'exam', 'notice period', 'resign',
  'clearance', 'allowance', 'policy', 'entitled', 'entitlement', 'password',
  'monitor', 'backup', 'install', 'software', 'breach', 'keys', 'damaged',
];

async function ask(req, res) {
  const { question } = req.body;

  if (!question || !String(question).trim()) {
    return res.status(400).json({ error: 'A question is required' });
  }
  if (String(question).length > 500) {
    return res.status(400).json({ error: 'That question is too long' });
  }

  const text = String(question).trim();
  const lower = text.toLowerCase();
  const scope = branchScopeFor(req);
  const role = canonicalRole(req.user.role);

  try {
    let data = '';
    let sources = [];

    // ---- policy, first ----
    if (POLICY_WORDS.some((w) => lower.includes(w))) {
      const entries = await policyAnswer(text);
      data = entries.length
        ? entries.map((e) => `Q: ${e.question}\nA: ${e.answer}`).join('\n\n')
        : 'NOTHING FOUND. Say this is not documented here and suggest asking P&C or ICT.';
      sources = entries.map((e) => e.question);
    }

    // ---- a specific asset ----
    else if (/\b(?:vfk|kdt|nc|eqp|c&p|f&f|int)[\s\-\/]?\d{3,6}\b/i.test(text)) {
      const found = await assetByCode(text, scope);
      if (!found) {
        data = 'No asset code was recognised in the question.';
      } else if (!found.asset) {
        data = `${found.code} is not in the records available to you.`;
      } else {
        const a = found.asset;
        data =
          `${a.asset_code} — ${a.description}\n` +
          `Category: ${a.category || 'uncategorised'}\n` +
          `Status: ${a.status}\n` +
          `Condition: ${a.condition || 'not yet verified'}\n` +
          `Value: ${money(a.purchase_price)}\n` +
          `Held by: ${a.holder || 'nobody — in storage'}\n` +
          `Location: ${[a.branch, a.department, a.physical_location].filter(Boolean).join(' · ') || 'not recorded'}`;
        sources = [a.asset_code];
      }
    }

    // ---- what does a person hold ----
    else if (/what (?:assets?|equipment|devices?|items?)|who (?:has|holds)|assigned to|issued to/i.test(lower)) {
      // Read-only roles see this in the panel too, so no extra gate here — but
      // the branch scope still applies.
      const match = await findEmployee(text, scope);
      if (!match) {
        data = 'No staff member matched that name. A full name is needed — a first name alone is too ambiguous.';
      } else if (match.ambiguous) {
        data = `Several people match: ${match.ambiguous.join(', ')}. Ask again with the full name.`;
      } else {
        const held = await employeeHoldings(match.employee.id, scope);
        const total = held.reduce((s, h) => s + Number(h.purchase_price || 0), 0);
        data = held.length
          ? `${match.employee.name} (${match.employee.branch || 'branch not recorded'}) holds ` +
            `${held.length} asset${held.length === 1 ? '' : 's'}, worth ${money(total)}:\n` +
            held.map((h) => `${h.asset_code} — ${h.description} (${h.condition || 'not verified'})`).join('\n') +
            (match.employee.employment_status !== 'active'
              ? `\nNOTE: this person is recorded as ${match.employee.employment_status}.`
              : '')
          : `${match.employee.name} has no assets currently assigned.`;
        sources = held.map((h) => h.asset_code);
      }
    }

    // ---- a branch, or the whole register ----
    else {
      const branch = await findBranch(text);

      if (branch && scope && branch.toLowerCase() !== scope.toLowerCase()) {
        data = `NOT PERMITTED. This user can only be told about ${scope}. Say so plainly.`;
      } else if (branch) {
        const rows = await branchSummary(branch, scope);
        const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
        const count = rows.reduce((s, r) => s + r.assets, 0);
        data = rows.length
          ? `${branch}: ${count} assets currently assigned, worth ${money(total)}.\n` +
            rows.map((r) => `${r.assets}x ${r.category} (${money(r.value)})`).join('\n')
          : `No assets are currently assigned at ${branch}.`;
        sources = [branch];
      } else {
        const rows = await registerTotals(scope);
        const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
        data =
          (scope ? `Figures for ${scope} only.\n` : 'Whole register.\n') +
          rows.map((r) => `${r.status}: ${r.assets} assets (${money(r.value)})`).join('\n') +
          `\nTotal recorded value: ${money(total)}`;
      }
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.2,   // low: this is reporting, not writing
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `QUESTION: ${text}\n\nDATA:\n${data}` },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim()
      || 'I could not put that into words. Please try rephrasing.';

    // Who asked what, and under what scope. A log recording the question but
    // not the scope is of little use if anyone later asks what was disclosed.
    await pool.query(
      `INSERT INTO bot_query_log
         (platform_user_id, username, staff_id, query, intent, response, scoped_to_branch, refused)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [`web:${req.user.id}`, req.user.email, req.user.id, text, 'assistant',
       answer, scope || null, data.startsWith('NOT PERMITTED')]
    ).catch((err) => console.error('Could not log the assistant query:', err.message));

    res.json({ answer, sources, scoped_to: scope || null, role });
  } catch (err) {
    console.error('Assistant failed:', err);
    res.status(500).json({ error: 'The assistant could not answer that. Please try again.' });
  }
}

module.exports = { ask };