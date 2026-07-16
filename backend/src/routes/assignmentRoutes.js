const express = require('express');
const router = express.Router();
const { createAssignment, returnAssignment, getAssetHistory } = require('../controllers/assignmentController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/', createAssignment);
router.patch('/:id/return', returnAssignment);
router.get('/history/:asset_id', getAssetHistory);

module.exports = router;