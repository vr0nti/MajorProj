const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const User = require('../models/User');

exports.addTimetable = async (req, res) => {
  try {
    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied. Only department admins can add timetables.' });
    }
    
    const { class: classId, schedule, academicYear, semester } = req.body;
    console.log(req.body);
    // Verify class exists
    console.log(schedule[0].periods);
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Department admins can only add timetables for classes in their department
    if (classData.department.toString() !== req.user.department) {
      return res.status(403).json({ message: 'You can only add timetables for classes in your assigned department' });
    }
    
    // Check if timetable already exists for this class
    const existingTimetable = await Timetable.findOne({ class: classId });
    if (existingTimetable) {
      return res.status(400).json({ message: 'Timetable already exists for this class' });
    }
    console.log("0");
    const timetable = new Timetable({ 
      class: classId, 
      department: classData.department,
      schedule,
      academicYear: academicYear || classData.academicYear,
      semester: semester || classData.semester
    });
    await timetable.save();
    // Update class with timetable reference
    await Class.findByIdAndUpdate(classId, { timetable: timetable._id });
  
    const populatedTimetable = await Timetable.findById(timetable._id)
      .populate('class', 'name fullName')
      .populate('department', 'name code')
      .populate({
        path: 'schedule.periods.subject',
        select: 'name code'
      })
      .populate({
        path: 'schedule.periods.faculty',
        select: 'name email'
      });
 
    res.status(201).json(populatedTimetable);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getTimetable = async (req, res) => {
  try {
    const { classId } = req.params;
    
    const timetable = await Timetable.findOne({ class: classId })
      .populate('class', 'name fullName')
      .populate('department', 'name code')
      .populate({
        path: 'schedule.periods.subject',
        select: 'name code'
      })
      .populate({
        path: 'schedule.periods.faculty',
        select: 'name email'
      });
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTimetable = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { id } = req.params;
    const { schedule, status } = req.body;
    
    // Sanitize schedule: convert empty string subject/faculty to null
    if (Array.isArray(schedule)) {
      schedule.forEach(dayObj => {
        if (Array.isArray(dayObj.periods)) {
          dayObj.periods.forEach(period => {
            if (period.subject === "") period.subject = null;
            if (period.faculty === "") period.faculty = null;
          });
        }
      });
    }
    
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    console.log(schedule);
    const updatedTimetable = await Timetable.findByIdAndUpdate(
      id,
      { schedule, status },
      { new: true, runValidators: true }
    )
    .populate('class', 'name fullName')
    .populate('department', 'name code')
    .populate({
      path: 'schedule.periods.subject',
      select: 'name code'
    })
    .populate({
      path: 'schedule.periods.faculty',
      select: 'name email'
    });
    
    res.json(updatedTimetable);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTimetable = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { id } = req.params;
    
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // Remove timetable reference from class
    await Class.findByIdAndUpdate(timetable.class, { $unset: { timetable: 1 } });
    
    await Timetable.findByIdAndDelete(id);
    res.json({ message: 'Timetable deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTimetablesByDepartment = async (req, res) => {
  try {
    const { departmentId, academicYear, semester } = req.query;
    let query = {};
    
    if (departmentId) query.department = departmentId;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    
    const timetables = await Timetable.find(query)
      .populate('class', 'name fullName')
      .populate('department', 'name code')
      .populate({
        path: 'schedule.periods.subject',
        select: 'name code'
      })
      .populate({
        path: 'schedule.periods.faculty',
        select: 'name email'
      });
    
    res.json(timetables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTeacherTimetable = async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Verify faculty exists
    const faculty = await User.findById(teacherId);
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    const timetables = await Timetable.find({
      'schedule.periods.faculty': teacherId
    })
    .populate('class', 'name fullName')
    .populate('department', 'name code')
    .populate({
      path: 'schedule.periods.subject',
      select: 'name code'
    })
    .populate({
      path: 'schedule.periods.faculty',
      select: 'name email'
    });
    
    res.json(timetables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStudentTimetable = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Get student's class
    const student = await User.findById(studentId).populate('class');
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    if (!student.class) {
      return res.status(404).json({ message: 'Student is not assigned to any class' });
    }
    
    const timetable = await Timetable.findOne({ class: student.class._id })
      .populate('class', 'name fullName')
      .populate('department', 'name code')
      .populate({
        path: 'schedule.periods.subject',
        select: 'name code'
      })
      .populate({
        path: 'schedule.periods.faculty',
        select: 'name email'
      });
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found for this class' });
    }
    
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 