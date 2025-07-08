const express = require('express');
const router = express.Router();
const departmentAdminController = require('../controllers/departmentAdminController');
const auth = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Dashboard
router.get('/dashboard', departmentAdminController.getDashboard);

// Classes routes
router.get('/classes', departmentAdminController.getClasses);
router.post('/classes', departmentAdminController.createClass);
router.put('/classes/:id', departmentAdminController.updateClass);
router.delete('/classes/:id', departmentAdminController.deleteClass);

// Faculty routes
router.get('/faculty', departmentAdminController.getFaculty);
router.post('/faculty', departmentAdminController.createFaculty);
router.put('/faculty/:id', departmentAdminController.updateFaculty);
router.delete('/faculty/:id', departmentAdminController.deleteFaculty);
router.post('/faculty/:id/reset-password', departmentAdminController.resetFacultyPassword);

// Subjects routes
router.get('/subjects', departmentAdminController.getSubjects);
router.post('/subjects', departmentAdminController.createSubject);
router.put('/subjects/:id', departmentAdminController.updateSubject);
router.delete('/subjects/:id', departmentAdminController.deleteSubject);

// Students routes
router.get('/students', departmentAdminController.getStudents);
router.post('/students', departmentAdminController.createStudent);
router.put('/students/:id', departmentAdminController.updateStudent);
router.delete('/students/:id', departmentAdminController.deleteStudent);
router.post('/students/:id/reset-password', departmentAdminController.resetStudentPassword);

// Helper list routes
router.get('/faculty-list', departmentAdminController.getFacultyList);
router.get('/subjects-list', departmentAdminController.getSubjectsList);
router.get('/classes-list', departmentAdminController.getClassesList);

module.exports = router; 