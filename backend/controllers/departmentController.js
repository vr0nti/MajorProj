const Department = require('../models/Department');
const User = require('../models/User');
const Class = require('../models/Class');

exports.addDepartment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { name, code, description, admins } = req.body;
    
    // Check if department with same name or code already exists
    const existingDept = await Department.findOne({ 
      $or: [{ name }, { code }] 
    });
    if (existingDept) {
      return res.status(400).json({ 
        message: 'Department with this name or code already exists' 
      });
    }
    
    const department = new Department({ name, code, description, admins });
    await department.save();
    res.status(201).json(department);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllDepartments = async (req, res) => {
  try {
    console.log(req.user);
    const departments = await Department.find()
      .populate('admins', 'name email role')
      .populate({
        path: 'classes',
        select: 'name fullName classTeacher currentStrength capacity status',
        populate: {
          path: 'classTeacher',
          select: 'name email'
        }
      });
    console.log(departments);
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id)
      .populate('admins', 'name email role')
      .populate({
        path: 'classes',
        select: 'name fullName classTeacher currentStrength capacity status academicYear semester',
        populate: [
          {
            path: 'classTeacher',
            select: 'name email'
          },
          {
            path: 'students',
            select: 'name email rollNumber status'
          }
        ]
      });
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json(department);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { id } = req.params;
    const { name, code, description, status } = req.body;
    
    // Check if name or code conflicts with other departments
    const existingDept = await Department.findOne({ 
      $or: [{ name }, { code }],
      _id: { $ne: id }
    });
    if (existingDept) {
      return res.status(400).json({ 
        message: 'Department with this name or code already exists' 
      });
    }
    
    const department = await Department.findByIdAndUpdate(
      id, 
      { name, code, description, status }, 
      { new: true, runValidators: true }
    );
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json(department);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { id } = req.params;
    
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    // Check if department has any classes
    if (department.classes.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete department with existing classes. Please remove all classes first.' 
      });
    }
    
    // Check if department has any admins
    if (department.admins.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete department with existing admins. Please remove all admins first.' 
      });
    }
    
    await Department.findByIdAndDelete(id);
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.assignDepartmentAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { departmentId, adminId } = req.body;
    
    // Verify admin exists and has correct role
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'departmentAdmin') {
      return res.status(400).json({ message: 'Invalid admin user' });
    }
    
    const updatedDepartment = await Department.findByIdAndUpdate(
      departmentId, 
      { $addToSet: { admins: adminId } }, 
      { new: true }
    ).populate('admins', 'name email role');
    
    res.json(updatedDepartment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeDepartmentAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { departmentId, adminId } = req.params;
    
    const updatedDepartment = await Department.findByIdAndUpdate(
      departmentId, 
      { $pull: { admins: adminId } }, 
      { new: true }
    ).populate('admins', 'name email role');
    
    if (!updatedDepartment) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json(updatedDepartment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 