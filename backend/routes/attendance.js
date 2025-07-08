const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const auth = require('../middlewares/auth');

router.post('/mark', auth, attendanceController.markAttendance);
router.get('/records', auth, attendanceController.getAttendance);

// Faculty: Get today's periods
router.get('/faculty/periods-today', auth, attendanceController.getFacultyPeriodsToday);
// Faculty: Mark attendance for a period
router.post('/faculty/mark', auth, attendanceController.markAttendanceByFaculty);

module.exports = router; 