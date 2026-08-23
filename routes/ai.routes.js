const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ai.controller');
const { requireAuth, requireAuthApi } = require('../middleware/auth');

router.get('/finder', requireAuth, ctrl.finderPage);
router.post('/finder/search', requireAuthApi, ctrl.search);

module.exports = router;
