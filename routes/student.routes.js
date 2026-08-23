const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/student.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/profile', requireAuth, requireRole('student'), ctrl.viewProfile);
router.get('/profile/edit', requireAuth, requireRole('student'), ctrl.editProfileForm);
router.post('/profile/edit', requireAuth, requireRole('student'), ctrl.updateProfile);

module.exports = router;
