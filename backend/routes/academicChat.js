const express = require('express');
const { askDoubtSolver } = require('../controllers/academicChatController');
const router = express.Router();

router.post('/ask', askDoubtSolver);

module.exports = router; 