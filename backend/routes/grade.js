const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const auth = require('../middlewares/auth');

// All routes require authentication
router.use(auth);

// New grading system routes
router.post('/mid-exam', gradeController.addMidExamMarks);
router.post('/external-marks', gradeController.addExternalMarks);
router.put('/mid-exam/:id', gradeController.updateMidExamMarks);
router.put('/external-marks/:id', gradeController.updateExternalMarks);

// Semester results and detailed grades
router.get('/semester-results/:studentId', gradeController.getSemesterResults);
router.get('/detailed-grades/:studentId', gradeController.getStudentDetailedGrades);
router.get('/faculty-grades', gradeController.getFacultyGrades);

// Release semester grades (department admin)
router.post('/release-semester', gradeController.releaseSemesterGrades);

// Legacy routes for backward compatibility
router.post('/add', gradeController.addGrade);
router.put('/update/:id', gradeController.updateGrade);
router.delete('/delete/:id', gradeController.deleteGrade);

// Get grades
router.get('/student/:studentId', gradeController.getStudentGrades);
router.get('/class', gradeController.getClassGrades);
router.get('/statistics', gradeController.getGradeStatistics);

module.exports = router; 