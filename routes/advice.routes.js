const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/advice.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.advicePage);
router.post('/questions', requireAuth, requireRole('student'), ctrl.postQuestion);
router.post('/questions/:questionId(\\d+)/answers', requireAuth, requireRole('alumni'), ctrl.postAnswer);
router.post('/answers/:answerId(\\d+)/edit', requireAuth, requireRole('alumni'), ctrl.editAnswer);

module.exports = router;
