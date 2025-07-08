const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const auth = require('../middlewares/auth');

router.post('/add', auth, classController.addClass);
router.get('/all', auth, classController.getAllClasses);
router.get('/:id', auth, classController.getClassById);
router.put('/:id', auth, classController.updateClass);
router.delete('/:id', auth, classController.deleteClass);
router.post('/assign-teacher', auth, classController.assignClassTeacher);
router.post('/add-student', auth, classController.addStudentToClass);
router.delete('/:classId/student/:studentId', auth, classController.removeStudentFromClass);
router.get('/:id/students', auth, classController.getClassStudents);

module.exports = router; 