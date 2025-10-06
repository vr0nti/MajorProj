const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const User = require('../models/User');

// Utility function to detect conflicts
const detectConflicts = async (schedule, excludeTimetableId = null) => {
  const conflicts = {
    facultyConflicts: [],
    roomConflicts: [],
    hasConflicts: false
  };

  // Get all timetables except the one being edited
  const query = excludeTimetableId ? { _id: { $ne: excludeTimetableId } } : {};
  const allTimetables = await Timetable.find(query)
    .populate('class', 'name fullName')
    .populate('schedule.periods.faculty', 'name');

  // Check each period in the new schedule
  for (const daySchedule of schedule) {
    const day = daySchedule.day;
    
    for (const period of daySchedule.periods) {
      if (period.type !== 'class') continue;
      
      const { faculty, room, startTime, endTime } = period;
      
      // Check faculty conflicts
      if (faculty) {
        for (const tt of allTimetables) {
          const sameDaySchedule = tt.schedule.find(s => s.day === day);
          if (!sameDaySchedule) continue;
          
          for (const existingPeriod of sameDaySchedule.periods) {
            if (existingPeriod.type !== 'class') continue;
            if (!existingPeriod.faculty) continue;
            
            const facultyId = existingPeriod.faculty._id || existingPeriod.faculty;
            if (facultyId.toString() === faculty.toString()) {
              // Check time overlap
              if (timesOverlap(startTime, endTime, existingPeriod.startTime, existingPeriod.endTime)) {
                conflicts.facultyConflicts.push({
                  day,
                  time: `${startTime}-${endTime}`,
                  faculty: existingPeriod.faculty.name || 'Faculty',
                  conflictingClass: tt.class?.fullName || tt.class?.name || 'Unknown Class'
                });
                conflicts.hasConflicts = true;
              }
            }
          }
        }
      }
      
      // Check room conflicts
      if (room) {
        for (const tt of allTimetables) {
          const sameDaySchedule = tt.schedule.find(s => s.day === day);
          if (!sameDaySchedule) continue;
          
          for (const existingPeriod of sameDaySchedule.periods) {
            if (existingPeriod.type !== 'class') continue;
            if (!existingPeriod.room) continue;
            
            if (existingPeriod.room.trim().toLowerCase() === room.trim().toLowerCase()) {
              // Check time overlap
              if (timesOverlap(startTime, endTime, existingPeriod.startTime, existingPeriod.endTime)) {
                conflicts.roomConflicts.push({
                  day,
                  time: `${startTime}-${endTime}`,
                  room,
                  conflictingClass: tt.class?.fullName || tt.class?.name || 'Unknown Class'
                });
                conflicts.hasConflicts = true;
              }
            }
          }
        }
      }
    }
  }

  return conflicts;
};

// Helper function to check if two time periods overlap
const timesOverlap = (start1, end1, start2, end2) => {
  return (start1 < end2) && (end1 > start2);
};

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
    
    // Sanitize schedule: convert empty string subject/faculty to null (e.g., breaks)
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
    
    // Detect conflicts
    const conflicts = await detectConflicts(schedule);
    if (conflicts.hasConflicts) {
      return res.status(400).json({ 
        message: 'Scheduling conflicts detected',
        conflicts
      });
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
    
    // Detect conflicts (excluding current timetable)
    const conflicts = await detectConflicts(schedule, id);
    if (conflicts.hasConflicts) {
      return res.status(400).json({ 
        message: 'Scheduling conflicts detected',
        conflicts
      });
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

// Get faculty workload statistics
exports.getFacultyWorkload = async (req, res) => {
  try {
    const { departmentId } = req.query;
    
    let query = {};
    if (departmentId) {
      query.department = departmentId;
    }
    
    const timetables = await Timetable.find(query)
      .populate('class', 'name fullName')
      .populate('schedule.periods.faculty', 'name email');
    
    // Calculate workload for each faculty
    const workloadMap = {};
    
    for (const tt of timetables) {
      for (const daySchedule of tt.schedule) {
        for (const period of daySchedule.periods) {
          if (period.type === 'class' && period.faculty) {
            const facultyId = period.faculty._id || period.faculty;
            const facultyName = period.faculty.name || 'Unknown';
            
            if (!workloadMap[facultyId]) {
              workloadMap[facultyId] = {
                facultyId,
                facultyName,
                totalHours: 0,
                periodsCount: 0,
                classes: new Set(),
                subjects: new Set()
              };
            }
            
            // Calculate period duration
            const duration = calculateDuration(period.startTime, period.endTime);
            workloadMap[facultyId].totalHours += duration;
            workloadMap[facultyId].periodsCount += 1;
            workloadMap[facultyId].classes.add(tt.class?.fullName || tt.class?.name);
            if (period.subject) {
              workloadMap[facultyId].subjects.add(period.subject.name || period.subject);
            }
          }
        }
      }
    }
    
    // Convert Sets to Arrays and format response
    const workload = Object.values(workloadMap).map(item => ({
      facultyId: item.facultyId,
      facultyName: item.facultyName,
      totalHours: Math.round(item.totalHours * 100) / 100,
      periodsCount: item.periodsCount,
      classesCount: item.classes.size,
      subjectsCount: item.subjects.size,
      classes: Array.from(item.classes),
      subjects: Array.from(item.subjects)
    }));
    
    // Sort by totalHours descending
    workload.sort((a, b) => b.totalHours - a.totalHours);
    
    res.json(workload);
  } catch (err) {
    console.error('Faculty workload error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get room utilization statistics
exports.getRoomUtilization = async (req, res) => {
  try {
    const { departmentId } = req.query;
    
    let query = {};
    if (departmentId) {
      query.department = departmentId;
    }
    
    const timetables = await Timetable.find(query)
      .populate('class', 'name fullName');
    
    // Calculate utilization for each room
    const roomMap = {};
    
    for (const tt of timetables) {
      for (const daySchedule of tt.schedule) {
        for (const period of daySchedule.periods) {
          if (period.type === 'class' && period.room) {
            const room = period.room.trim();
            
            if (!roomMap[room]) {
              roomMap[room] = {
                room,
                totalHours: 0,
                periodsCount: 0,
                classes: new Set()
              };
            }
            
            // Calculate period duration
            const duration = calculateDuration(period.startTime, period.endTime);
            roomMap[room].totalHours += duration;
            roomMap[room].periodsCount += 1;
            roomMap[room].classes.add(tt.class?.fullName || tt.class?.name);
          }
        }
      }
    }
    
    // Convert Sets to Arrays and format response
    const utilization = Object.values(roomMap).map(item => ({
      room: item.room,
      totalHours: Math.round(item.totalHours * 100) / 100,
      periodsCount: item.periodsCount,
      classesCount: item.classes.size,
      utilizationPercentage: Math.round((item.totalHours / (6 * 8)) * 100), // Assuming 6 days, 8 hours per day
      classes: Array.from(item.classes)
    }));
    
    // Sort by utilizationPercentage descending
    utilization.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);
    
    res.json(utilization);
  } catch (err) {
    console.error('Room utilization error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Check for conflicts endpoint
exports.checkConflicts = async (req, res) => {
  try {
    const { schedule, excludeTimetableId } = req.body;
    
    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ message: 'Invalid schedule data' });
    }
    
    const conflicts = await detectConflicts(schedule, excludeTimetableId);
    res.json(conflicts);
  } catch (err) {
    console.error('Check conflicts error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Copy timetable to another class
exports.copyTimetable = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { sourceTimetableId, targetClassId } = req.body;
    
    // Get source timetable
    const sourceTimetable = await Timetable.findById(sourceTimetableId);
    if (!sourceTimetable) {
      return res.status(404).json({ message: 'Source timetable not found' });
    }
    
    // Get target class
    const targetClass = await Class.findById(targetClassId);
    if (!targetClass) {
      return res.status(404).json({ message: 'Target class not found' });
    }
    
    // Check if target class already has a timetable
    const existingTimetable = await Timetable.findOne({ class: targetClassId });
    if (existingTimetable) {
      return res.status(400).json({ message: 'Target class already has a timetable' });
    }
    
    // Check for conflicts
    const conflicts = await detectConflicts(sourceTimetable.schedule);
    if (conflicts.hasConflicts) {
      return res.status(400).json({ 
        message: 'Cannot copy timetable due to conflicts',
        conflicts
      });
    }
    
    // Create new timetable
    const newTimetable = new Timetable({
      class: targetClassId,
      department: targetClass.department,
      schedule: sourceTimetable.schedule,
      academicYear: targetClass.academicYear,
      semester: targetClass.semester
    });
    
    await newTimetable.save();
    
    // Update class with timetable reference
    await Class.findByIdAndUpdate(targetClassId, { timetable: newTimetable._id });
    
    const populatedTimetable = await Timetable.findById(newTimetable._id)
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
    
    res.status(201).json({
      message: 'Timetable copied successfully',
      timetable: populatedTimetable
    });
  } catch (err) {
    console.error('Copy timetable error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Helper function to calculate duration in hours
const calculateDuration = (startTime, endTime) => {
  const start = startTime.split(':').map(Number);
  const end = endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  return (endMinutes - startMinutes) / 60;
};
