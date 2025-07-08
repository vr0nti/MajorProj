const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const auth = require('../middlewares/auth');

router.post('/add', auth, departmentController.addDepartment);
router.get('/all', auth, departmentController.getAllDepartments);
router.get('/:id', auth, departmentController.getDepartmentById);
router.put('/:id', auth, departmentController.updateDepartment);
router.delete('/:id', auth, departmentController.deleteDepartment);
router.post('/assign-admin', auth, departmentController.assignDepartmentAdmin);
router.delete('/:departmentId/admin/:adminId', auth, departmentController.removeDepartmentAdmin);

module.exports = router; 