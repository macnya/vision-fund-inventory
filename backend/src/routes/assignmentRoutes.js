const express = require('express');
const router = express.Router();

const controller = require('../controllers/assignmentController');
const auth = require('../middleware/authMiddleware');

console.log('========== ASSIGNMENT ROUTE DEBUG ==========');
console.log('Controller exports:', controller);
console.log('Auth exports:', auth);

const {
  createAssignment,
  returnAssignment,
  getAssetHistory,
} = controller;

const { verifyToken } = auth;

console.log('createAssignment:', typeof createAssignment);
console.log('returnAssignment:', typeof returnAssignment);
console.log('getAssetHistory:', typeof getAssetHistory);
console.log('verifyToken:', typeof verifyToken);
console.log('============================================');

router.use(verifyToken);

router.post('/', createAssignment);
router.patch('/:id/return', returnAssignment);
router.get('/history/:asset_id', getAssetHistory);

module.exports = router;