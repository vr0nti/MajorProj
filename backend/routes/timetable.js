const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const timetableOptimizationController = require('../controllers/timetableOptimizationController');
const auth = require('../middlewares/auth');

// Basic CRUD
router.post('/add', auth, timetableController.addTimetable);
router.get('/class/:classId', auth, timetableController.getTimetable);
router.put('/:id', auth, timetableController.updateTimetable);
router.delete('/:id', auth, timetableController.deleteTimetable);

// Query routes
router.get('/department/all', auth, timetableController.getTimetablesByDepartment);
router.get('/teacher/:teacherId', auth, timetableController.getTeacherTimetable);
router.get('/student/:studentId', auth, timetableController.getStudentTimetable);

// Analytics & Statistics
router.get('/analytics/comprehensive', auth, timetableController.getTimetableAnalytics);
router.get('/analytics/faculty-workload', auth, timetableController.getFacultyWorkload);
router.get('/analytics/room-utilization', auth, timetableController.getRoomUtilization);

// Conflict detection
router.post('/check-conflicts', auth, timetableController.checkConflicts);

// Bulk operations
router.post('/copy', auth, timetableController.copyTimetable);

// Optimization routes - NEW CLEAN IMPLEMENTATION
router.get('/optimize/view', auth, timetableOptimizationController.getTimetablesBySemester);
router.post('/optimize/suggestions', auth, timetableOptimizationController.generateIntelligentSuggestions);
router.get('/optimize/analytics', auth, timetableOptimizationController.getComprehensiveAnalytics);

module.exports = router;
