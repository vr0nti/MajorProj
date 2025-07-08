const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

router.get('/profile', auth, userController.getProfile);
router.get('/all', auth, userController.getAllUsers);
router.get('/admins', auth, userController.getAllAdmins);
router.get('/department-admins', auth, userController.getAllDepartmentAdmins);
router.get('/faculty', auth, userController.getAllFaculty);
router.get('/students', auth, userController.getAllStudents);
router.get('/department/:departmentId', auth, userController.getUsersByDepartment);
router.post('/', auth, userController.createUser);
router.put('/:id', auth, userController.updateUser);
router.delete('/:id', auth, userController.deleteUser);
router.get('/faculty/classes', auth, userController.getFacultyClasses);

module.exports = router; 