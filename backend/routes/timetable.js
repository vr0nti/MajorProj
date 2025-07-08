const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const auth = require('../middlewares/auth');

router.post('/add', auth, timetableController.addTimetable);
router.get('/class/:classId', auth, timetableController.getTimetable);
router.put('/:id', auth, timetableController.updateTimetable);
router.delete('/:id', auth, timetableController.deleteTimetable);
router.get('/department/all', auth, timetableController.getTimetablesByDepartment);
router.get('/teacher/:teacherId', auth, timetableController.getTeacherTimetable);
router.get('/student/:studentId', auth, timetableController.getStudentTimetable);

module.exports = router; 