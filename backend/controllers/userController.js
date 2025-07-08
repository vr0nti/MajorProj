const User = require('../models/User');
const Department = require('../models/Department');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const bcrypt = require('bcrypt');
const Timetable = require('../models/Timetable');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('department', 'name code')
      .populate('class', 'name fullName');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const users = await User.find()
      .select('-password')
      .populate('department', 'name code')
      .populate('class', 'name fullName');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getAllAdmins = async (req, res) => {
  try {
    if (req.user.role !== 'departmentAdmin') return res.status(403).json({ message: 'Access denied' });
    const users = await User.find({ role: 'admin' })
      .select('-password')
     
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllDepartmentAdmins = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const users = await User.find({ role: 'departmentAdmin' })
      .select('-password')
      .populate('department', 'name code');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllFaculty = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { departmentId } = req.query;
    let query = { role: 'faculty' };
    
    if (departmentId) {
      query.department = departmentId;
    }
    
    const faculty = await User.find(query)
      .select('-password')
      .populate('department', 'name code');
    
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { departmentId, classId } = req.query;
    let query = { role: 'student' };
    
    if (departmentId) {
      query.department = departmentId;
    }
    
    if (classId) {
      query.class = classId;
    }
    
    const students = await User.find(query)
      .select('-password')
      .populate('department', 'name code')
      .populate('class', 'name fullName');
    
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role, 
      department, 
      class: classId, 
      phone,
      specialization,
      qualification,
      experience,
      designation,
      rollNumber,
      semester,
      address,
      parentName,
      parentPhone,
      status = 'active'
    } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Role-based permissions
    let targetDepartment = department;
    
    if (req.user.role === 'admin') {
      // Super admin can create department admins and assign them to any department
      if (role === 'departmentAdmin') {
        if (!department) {
          return res.status(400).json({ message: 'Department is required for department admin' });
        }
        targetDepartment = department;
      } else if (role === 'admin') {
        return res.status(403).json({ message: 'Cannot create another super admin' });
      } else {
        return res.status(403).json({ message: 'Super admin can only create department admins' });
      }
    } else if (req.user.role === 'departmentAdmin') {
      // Department admin can only create faculty and students for their own department
      if (role === 'admin' || role === 'departmentAdmin') {
        return res.status(403).json({ message: 'Department admins cannot create admin users' });
      }
      
      if (role !== 'faculty' && role !== 'student') {
        return res.status(403).json({ message: 'Department admins can only create faculty and students' });
      }
      
      targetDepartment = req.user.department;
      if (department && department !== targetDepartment) {
        return res.status(403).json({ message: 'You can only create users for your assigned department' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied. Only admins and department admins can create users.' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      department: targetDepartment,
      class: classId,
      phone,
      specialization,
      qualification,
      experience,
      designation,
      rollNumber,
      semester,
      address,
      parentName,
      parentPhone,
      status
    });
    
    await user.save();
    
    // Update Department model based on role
    if (role === 'student') {
      await Department.findByIdAndUpdate(targetDepartment, {
        $push: { students: user._id }
      });
    } else if (role === 'faculty') {
      await Department.findByIdAndUpdate(targetDepartment, {
        $push: { faculty: user._id }
      });
    } else if (role === 'departmentAdmin') {
      await Department.findByIdAndUpdate(targetDepartment, {
        $push: { admins: user._id }
      });
    }
    
    // If student is assigned to a class, update class student count
    if (role === 'student' && classId) {
      await Class.findByIdAndUpdate(classId, {
        $push: { students: user._id },
        $inc: { currentStrength: 1 }
      });
    }
    
    // Return user without password
    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('department', 'name code')
      .populate('class', 'name fullName');
    
    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Get the current user to check for changes
    const currentUser = await User.findById(id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Role-based permissions for updating
    if (req.user.role === 'admin') {
      // Super admin can update department admins
      if (currentUser.role === 'departmentAdmin') {
        // Allow updating department admin details
      } else if (currentUser.role === 'admin') {
        return res.status(403).json({ message: 'Cannot update another super admin' });
      } else {
        return res.status(403).json({ message: 'Super admin can only update department admins' });
      }
    } else if (req.user.role === 'departmentAdmin') {
      // Department admin can only update faculty and students in their department
      if (currentUser.role === 'admin' || currentUser.role === 'departmentAdmin') {
        return res.status(403).json({ message: 'Department admins cannot update admin users' });
      }
      
      if (currentUser.department.toString() !== req.user.department) {
        return res.status(403).json({ message: 'You can only update users in your assigned department' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied. Only admins and department admins can update users.' });
    }
    
    // Handle class changes for students
    if (currentUser.role === 'student' && updateData.class !== currentUser.class?.toString()) {
      // Remove from old class
      if (currentUser.class) {
        await Class.findByIdAndUpdate(currentUser.class, {
          $pull: { students: id },
          $inc: { currentStrength: -1 }
        });
      }
      
      // Add to new class
      if (updateData.class) {
        await Class.findByIdAndUpdate(updateData.class, {
          $push: { students: id },
          $inc: { currentStrength: 1 }
        });
      }
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .select('-password')
    .populate('department', 'name code')
    .populate('class', 'name fullName');
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the user to check their department and role
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Role-based permissions for deleting
    if (req.user.role === 'admin') {
      // Super admin can delete department admins
      if (user.role === 'departmentAdmin') {
        // Allow deleting department admin
      } else if (user.role === 'admin') {
        return res.status(403).json({ message: 'Cannot delete another super admin' });
      } else {
        return res.status(403).json({ message: 'Super admin can only delete department admins' });
      }
    } else if (req.user.role === 'departmentAdmin') {
      // Department admin can only delete faculty and students in their department
      if (user.role === 'admin' || user.role === 'departmentAdmin') {
        return res.status(403).json({ message: 'Department admins cannot delete admin users' });
      }
      
      if (user.department.toString() !== req.user.department) {
        return res.status(403).json({ message: 'You can only delete users in your assigned department' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied. Only admins and department admins can delete users.' });
    }
    
    // Remove student from class
    if (user.role === 'student' && user.class) {
      await Class.findByIdAndUpdate(user.class, {
        $pull: { students: id },
        $inc: { currentStrength: -1 }
      });
    }
    
    // Remove from department based on role
    if (user.role === 'student') {
      await Department.findByIdAndUpdate(user.department, {
        $pull: { students: id }
      });
    } else if (user.role === 'faculty') {
      await Department.findByIdAndUpdate(user.department, {
        $pull: { faculty: id }
      });
      
      // Remove from subjects
      await Subject.updateMany(
        { faculty: id },
        { $pull: { faculty: id } }
      );
      
      // Remove from classes where they are class teacher
      await Class.updateMany(
        { classTeacher: id },
        { $unset: { classTeacher: 1 } }
      );
    } else if (user.role === 'departmentAdmin') {
      await Department.findByIdAndUpdate(user.department, {
        $pull: { admins: id }
      });
    }
    
    // If user is a class teacher, update their status
    if (user.isClassTeacher) {
      await User.findByIdAndUpdate(id, { isClassTeacher: false });
    }
    
    // Delete the user
    await User.findByIdAndDelete(id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getUsersByDepartment = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { departmentId } = req.params;
    const { role } = req.query;
    
    let query = { department: departmentId };
    if (role) {
      query.role = role;
    }
    
    const users = await User.find(query)
      .select('-password')
      .populate('department', 'name code')
      .populate('class', 'name fullName');
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getFacultyClasses = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied' });
    }
    // Find all timetables where this faculty is assigned
    const teachingClasses = await Class.find({ 'subjects.faculty': req.user._id });
    // Extract unique classes
    const classMap = {};
    teachingClasses.forEach(cls => {
      if (cls._id) {
        classMap[cls._id] = cls;
      }
    });
    const classes = Object.values(classMap);
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 