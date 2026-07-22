const rateLimit = require('express-rate-limit');

// Blocks brute-force login attempts: 5 tries per IP per 15 minutes.
// Successful logins don't count against the limit.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

module.exports = { loginLimiter };