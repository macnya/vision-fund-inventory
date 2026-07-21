const express = require('express');
const router = express.Router();

const {
  createAssignment,
  returnAssignment,
  getAssetHistory,
} = require('../controllers/assignmentController');

const { verifyToken, requireRole, ROLES } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/', requireRole(ROLES.ADMIN, ROLES.OFFICER), createAssignment);
router.patch('/:id/return', requireRole(ROLES.ADMIN, ROLES.OFFICER), returnAssignment);
router.get('/history/:asset_id', getAssetHistory);

module.exports = router;