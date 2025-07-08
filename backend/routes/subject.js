const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const auth = require('../middlewares/auth');

// Only viewing subjects is allowed for all authenticated users
router.get('/all', auth, subjectController.getAllSubjects);

module.exports = router; 