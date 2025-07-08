const Class = require('../models/Class');
const User = require('../models/User');
const Department = require('../models/Department');
const Timetable = require('../models/Timetable');

exports.addClass = async (req, res) => {
  try {

    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied. Only department admins can add classes.' });
    }
    
    const { name, departmentId, classTeacherId, academicYear, semester, capacity, subjects } = req.body;
  
    // For department admins, ensure they can only add classes to their department
    let targetDepartmentId = req.user.department;
    if (departmentId && departmentId !== req.user.department) {
      return res.status(403).json({ message: 'You can only add classes to your assigned department' });
    }
    
    // Verify department exists
    const department = await Department.findById(targetDepartmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    // Check if class with same name already exists in this department
    const existingClass = await Class.findOne({ 
      name, 
      department: targetDepartmentId,
      academicYear,
      semester
    });
    if (existingClass) {
      return res.status(400).json({ 
        message: 'Class with this name already exists in this department for the given academic year and semester' 
      });
    }
    
    const newSubjects = subjects.filter(subject => subject.faculty !== '' && subject.faculty !== "-" && subject.faculty !== null);
    // Create full name (e.g., "CSE-A")
    const fullName = `${department.name}-${name}`;
    
    const tempClass = {
      name, 
      fullName,
      department: targetDepartmentId,
      academicYear,
      semester,
      capacity: capacity || 60,
      subjects: Array.isArray(newSubjects) ? newSubjects : []
    }

    if(classTeacherId && classTeacherId !== "-"){
      tempClass.classTeacher = classTeacherId;
    }

    const newClass = new Class(tempClass);
    
    await newClass.save();
    
    // Add class to department
    await Department.findByIdAndUpdate(targetDepartmentId, {
      $push: { classes: newClass._id }
    });
    
    // If class teacher is assigned, update their isClassTeacher status
    if (classTeacherId && classTeacherId !== "-") {
      await User.findByIdAndUpdate(classTeacherId, { isClassTeacher: true });
    }
    
    const populatedClass = await Class.findById(newClass._id)
      .populate('department', 'name code')
      .populate('classTeacher', 'name email')
      .populate('students', 'name email rollNumber')
      .populate({ path: 'subjects.subject', select: 'name code' })
      .populate({ path: 'subjects.faculty', select: 'name email' });
    
    res.status(201).json(populatedClass);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    const { departmentId, academicYear, semester } = req.query;
    let query = {};
    
    // For department admins, always filter by their department
    if (req.user.role === 'departmentAdmin') {
      query.department = req.user.department;
    } else if (departmentId) {
      query.department = departmentId;
    }
    
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    
    const classes = await Class.find(query)
      .populate('department', 'name code')
      .populate('classTeacher', 'name email')
      .populate('students', 'name email rollNumber')
      .populate('timetable', 'status');
    
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const classData = await Class.findById(id)
      .populate('department', 'name code')
      .populate('classTeacher', 'name email phone specialization')
      .populate('students', 'name email rollNumber year status')
      .populate({
        path: 'timetable',
        populate: {
          path: 'schedule.periods.subject',
          select: 'name code'
        }
      });
    
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    res.json(classData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied. Only department admins can update classes.' });
    }
    
    const { id } = req.params;
    const { name, classTeacherId, capacity, status,semester,academicYear, subjects } = req.body;
    
    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // For department admins, ensure they can only update classes in their department
    if (classData.department.toString() !== req.user.department) {
      return res.status(403).json({ message: 'You can only update classes in your assigned department' });
    }
    
    // Update class data
    console.log(subjects);
    if (name) classData.name = name;
    if (classTeacherId) classData.classTeacher = classTeacherId;
    if (capacity) classData.capacity = capacity;
    if (status) classData.status = status;
    if (semester) classData.semester = semester;
    if (academicYear) classData.academicYear = academicYear;
    const newSubjects = subjects.filter(subject => subject.faculty !== '' && subject.faculty !== "-" && subject.faculty !== null);
    console.log(newSubjects);
    if (Array.isArray(newSubjects)) classData.subjects = newSubjects;
    await classData.save();
    
    const updatedClass = await Class.findById(id)
      .populate('department', 'name code')
      .populate('classTeacher', 'name email')
      .populate('students', 'name email rollNumber')
      .populate({ path: 'subjects.subject', select: 'name code' })
      .populate({ path: 'subjects.faculty', select: 'name email' });

    if(classTeacherId && classTeacherId !== "-"){
      await User.findByIdAndUpdate(classTeacherId, { isClassTeacher: true });
    }
    
    res.json(updatedClass);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied. Only department admins can delete classes.' });
    }
    
    const { id } = req.params;
    
    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // For department admins, ensure they can only delete classes in their department
    if (classData.department.toString() !== req.user.department) {
      return res.status(403).json({ message: 'You can only delete classes in your assigned department' });
    }
    
    // Remove class from department
    await Department.findByIdAndUpdate(classData.department, {
      $pull: { classes: id }
    });
    
    // Remove class teacher status if assigned
    if (classData.classTeacher) {
      await User.findByIdAndUpdate(classData.classTeacher, { isClassTeacher: false });
    }
    
    // Remove students from this class
    if (classData.students && classData.students.length > 0) {
      await User.updateMany(
        { _id: { $in: classData.students } },
        { $unset: { class: 1 } }
      );
    }
    
    // Delete the class
    await Class.findByIdAndDelete(id);
    
    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.assignClassTeacher = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { classId, teacherId } = req.body;
    
    // Verify teacher exists and is faculty
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'faculty') {
      return res.status(400).json({ message: 'Invalid teacher' });
    }
    
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Update old class teacher status
    if (classData.classTeacher) {
      await User.findByIdAndUpdate(classData.classTeacher, { isClassTeacher: false });
    }
    
    // Update new class teacher status
    await User.findByIdAndUpdate(teacherId, { isClassTeacher: true });
    
    const updatedClass = await Class.findByIdAndUpdate(
      classId, 
      { classTeacher: teacherId }, 
      { new: true }
    )
    .populate('classTeacher', 'name email')
    .populate('department', 'name code');
    
    res.json(updatedClass);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addStudentToClass = async (req, res) => {
  try {
    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied. Only department admins can add students to classes.' });
    }
    
    const { classId, studentId } = req.body;
    
    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ message: 'Invalid student' });
    }
    
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // For department admins, ensure they can only add students to classes in their department
    if (classData.department.toString() !== req.user.department) {
      return res.status(403).json({ message: 'You can only add students to classes in your assigned department' });
    }
    
    // Check if class is full
    if (classData.currentStrength >= classData.capacity) {
      return res.status(400).json({ message: 'Class is at full capacity' });
    }
    
    // Check if student is already in this class
    if (classData.students.includes(studentId)) {
      return res.status(400).json({ message: 'Student is already in this class' });
    }
    
    // Add student to class
    await Class.findByIdAndUpdate(classId, {
      $push: { students: studentId },
      $inc: { currentStrength: 1 }
    });
    
    // Update student's class reference
    await User.findByIdAndUpdate(studentId, { class: classId });
    
    res.json({ message: 'Student added to class successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeStudentFromClass = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { classId, studentId } = req.params;
    
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Remove student from class
    await Class.findByIdAndUpdate(classId, {
      $pull: { students: studentId },
      $inc: { currentStrength: -1 }
    });
    
    // Update student's class reference
    await User.findByIdAndUpdate(studentId, { $unset: { class: 1 } });
    
    res.json({ message: 'Student removed from class successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getClassStudents = async (req, res) => {
  try {
    const classId = req.params.id;
    const classObj = await Class.findById(classId).populate('students', 'name rollNumber email status class');
    if (!classObj) return res.status(404).json({ message: 'Class not found' });
    res.json(classObj.students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 