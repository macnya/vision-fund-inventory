// Mirrors ROLES in backend/src/middleware/authMiddleware.js.
//
// 'Branch Manager' was renamed to 'Branch Administrator'. Accounts created
// before the rename still carry the old value, and the backend accepts both,
// so the UI has to as well or those users would see an empty nav bar.
export const ROLES = {
  ADMIN: 'IT Admin',
  OFFICER: 'IT Officer',
  BRANCH_ADMIN: 'Branch Administrator',
  AUDITOR: 'Auditor',
};

const LEGACY = {
  'Admin': ROLES.ADMIN,
  'Branch Manager': ROLES.BRANCH_ADMIN,
};

export function canonicalRole(role) {
  return LEGACY[role] || role;
}

export const ALL_ROLES = Object.values(ROLES);

// What each role can do, shown wherever access is being granted so whoever
// is choosing isn't guessing.
export const ROLE_NOTE = {
  [ROLES.ADMIN]:
    'Everything, across all branches. Edits the register, manages staff, disposes and writes off assets.',
  [ROLES.OFFICER]:
    'Scans, assigns and verifies assets in the field, at any branch. Cannot edit the register.',
  [ROLES.BRANCH_ADMIN]:
    'Sees only their own branch. Read-only.',
  [ROLES.AUDITOR]:
    'Read-only, across all branches.',
};

export function isAdmin(user) {
  return canonicalRole(user?.role) === ROLES.ADMIN;
}

// Who may create assets. Officers are the ones scanning unrecognised barcodes
// in the field, so they need to be able to finish that flow.
export function canCreateAssets(user) {
  const r = canonicalRole(user?.role);
  return r === ROLES.ADMIN || r === ROLES.OFFICER;
}

// Who may assign, check in, dispose or write off. Read-only roles see none of
// these buttons — the backend refuses them anyway, and offering a control that
// can only ever fail is worse than not offering it.
export function canChangeAssets(user) {
  const r = canonicalRole(user?.role);
  return r === ROLES.ADMIN || r === ROLES.OFFICER;
}

// Disposal and write-off are register-level decisions, not field ones.
export function canDispose(user) {
  return isAdmin(user);
}

// Creating employees, locations and staff accounts.
export function canManageRecords(user) {
  return isAdmin(user);
}