const express = require('express');
const { recommendCourses } = require('../controllers/courseAiController');
const router = express.Router();

router.post('/recommend', recommendCourses);
module.exports = router;