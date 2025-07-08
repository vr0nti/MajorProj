const Attendance = require('../models/Attendance');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.markAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') return res.status(403).json({ message: 'Access denied' });
    const { student, subject, class: classId, date, status } = req.body;
    const attendance = new Attendance({ faculty: req.user.id, student, subject, class: classId, date, status });
    await attendance.save();
    res.status(201).json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    // Admin can get all, faculty can get their own
    let filter = {};
    if (req.user.role === 'faculty') filter.faculty = req.user.id;
    if (req.query.class) filter.class = req.query.class;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.student){
      filter.attendance = {
        $elemMatch: {
          student: req.query.student
        }
      }
    }
    console.log(filter);
    const records = await Attendance.find(filter).populate('attendance.student').populate('subject').populate('class');
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get today's periods for logged-in faculty
exports.getFacultyPeriodsToday = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied' });
    }
    // Accept a 'day' query param for custom date
    let dayOfWeek = req.query.day;
    if (!dayOfWeek) {
      const today = new Date();
      dayOfWeek = today.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    }
    const Timetable = require('../models/Timetable');
    // Find all timetables where this faculty is assigned on the given day
    const timetables = await Timetable.find({
      'schedule.periods.faculty': req.user._id
    })
    .populate('class', 'name fullName semester')
    .populate({
      path: 'schedule.periods.subject',
      select: 'name code'
    });
    // Filter periods for the given day
    let periodsToday = [];
    timetables.forEach(tt => {
      const dayObj = tt.schedule.find(s => s.day === dayOfWeek);
      if (dayObj) {
        dayObj.periods.forEach(period => {
          if (period.faculty && period.faculty.toString() === req.user._id.toString()) {
            periodsToday.push({
              timetableId: tt._id,
              class: tt.class,
              subject: period.subject,
              period,
              day: dayObj.day
            });
          }
        });
      }
    });
    res.json(periodsToday);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Faculty marks attendance for a period
exports.markAttendanceByFaculty = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied' });
    }
    console.log("req.body", req.body);
    const { timetableId, periodIndex, date, attendance } = req.body;
    // attendance: [{ student: studentId, status: 'present'|'absent' }]
    const Timetable = require('../models/Timetable');
    const Class = require('../models/Class');
    const Attendance = require('../models/Attendance');
    console.log("0");
    const timetable = await Timetable.findById(timetableId);
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });
    // Find the period and check faculty assignment, subject, and class
    let found = false;
    let periodSubject = null;
    let periodClass = timetable.class;
    let periodDay = null;
    console.log("1");
    timetable.schedule.forEach(dayObj => {
      dayObj.periods.forEach((period, idx) => {
        if (idx === periodIndex && period.faculty && period.faculty.toString() === req.user._id.toString()) {
          found = true;
          periodSubject = period.subject;
          periodDay = dayObj.day;
        }
      });
    });
    console.log("2");
    if (!found) return res.status(403).json({ message: 'Not authorized for this period' });
    if (!periodSubject) return res.status(400).json({ message: 'No subject assigned to this period' });
    console.log("3");
    // Validate class exists
    const classObj = await Class.findById(periodClass).populate('students');
    if (!classObj) return res.status(404).json({ message: 'Class not found' });
    console.log("4");
    // Validate all students in attendance belong to the class
    const classStudentIds = classObj.students.map(s => s._id.toString());
    console.log("classStudentIds", classStudentIds);
    console.log("attendance", attendance);
    for (const att of attendance) {
      // Defensive: if att.student is an object, use its _id
      const studentId = typeof att.student === 'object' && att.student._id ? att.student._id.toString() : att.student;
      if (!classStudentIds.includes(studentId)) {
        // return res.status(400).json({ message: `Student ${studentId} does not belong to this class` });
        attendance.splice(attendance.indexOf(att), 1);
      }

      // Also, update att.student to be the string ID for saving
      att.student = studentId;
    }
    console.log("attendance", attendance);
    console.log("5");
    // Upsert: update if exists, else insert
    const existing = await Attendance.findOne({
      class: periodClass,
      subject: periodSubject,
      date,
      periodIndex
    });
    console.log("6");
    if (existing) {
      existing.attendance = attendance;
      await existing.save();
      return res.json({ message: 'Attendance updated successfully' });
    } else {
      console.log("7");
      const attendanceDoc = new Attendance({
        class: periodClass,
        subject: periodSubject,
        date,
        periodIndex,
        attendance
      });
      console.log("8");
      await attendanceDoc.save();
      console.log("9");
      return res.json({ message: 'Attendance marked successfully' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 