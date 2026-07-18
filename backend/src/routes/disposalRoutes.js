const express = require('express');
const router = express.Router();
const { createDisposal, getAllDisposals } = require('../controllers/disposalController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/', getAllDisposals);
router.post('/', createDisposal);

module.exports = router;