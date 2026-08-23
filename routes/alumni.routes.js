const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/alumni.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/finder', requireAuth, ctrl.finderPage);

router.get('/survey', requireAuth, requireRole('alumni'), ctrl.surveyPage);
router.post('/survey', requireAuth, requireRole('alumni'), ctrl.submitSurvey);

router.get('/profile', requireAuth, requireRole('alumni'), ctrl.viewOwnProfile);
router.get('/profile/edit', requireAuth, requireRole('alumni'), ctrl.editProfileForm);
router.post('/profile/edit', requireAuth, requireRole('alumni'), ctrl.updateProfile);

router.get('/career', requireAuth, requireRole('alumni'), ctrl.careerPage);
router.post('/career', requireAuth, requireRole('alumni'), ctrl.addCareerEntry);
router.post('/career/:entryId/delete', requireAuth, requireRole('alumni'), ctrl.deleteCareerEntry);

// Public-ish (any authenticated user) view of a specific alumnus's profile.
router.get('/:id', requireAuth, ctrl.viewAlumniProfile);

module.exports = router;
