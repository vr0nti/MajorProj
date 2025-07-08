const express = require('express');
const router = express.Router();
const { getDashboardStats, getRecentActivities, getUpcomingEvents } = require('../controllers/dashboardController');
const auth = require('../middlewares/auth');

// All routes require authentication
router.use(auth);

// Get dashboard statistics
router.get('/stats', getDashboardStats);

// Get recent activities
router.get('/recent-activities', getRecentActivities);

// Get upcoming events
router.get('/upcoming-events', getUpcomingEvents);

module.exports = router; 