const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');

router.get('/login', ctrl.showLogin);
router.get('/register', ctrl.showRegister);

router.post('/register/student', ctrl.registerStudent);
router.post('/register/alumni', ctrl.registerAlumni);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);

module.exports = router;
