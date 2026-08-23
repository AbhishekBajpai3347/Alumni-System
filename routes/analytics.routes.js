const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analytics.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.insightsPage);

module.exports = router;
