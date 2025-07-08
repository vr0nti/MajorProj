const User = require('../models/User');
const Department = require('../models/Department');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Notice = require('../models/Notice');
const Complaint = require('../models/Complaint');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Timetable = require('../models/Timetable');
const Chat = require('../models/Chat');

// Get dashboard statistics based on user role
const getDashboardStats = async (req, res) => {
  try {
    const { user } = req;
    let stats = {};

    switch (user.role) {
      case 'admin':
        stats = await getAdminStats();
        break;
      case 'departmentAdmin':
        stats = await getDepartmentAdminStats(user.department);
        break;
      case 'faculty':
        stats = await getFacultyStats(user._id);
        break;
      case 'student':
        stats = await getStudentStats(user._id);
        break;
      default:
        stats = {};
    }

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
};

// Get recent activities
const getRecentActivities = async (req, res) => {
  try {
    const { user } = req;
    let activities = [];

    // Get activities based on user role
    switch (user.role) {
      case 'admin':
        activities = await getAdminActivities();
        break;
      case 'departmentAdmin':
        activities = await getDepartmentAdminActivities(user.department);
        break;
      case 'faculty':
        activities = await getFacultyActivities(user._id);
        break;
      case 'student':
        activities = await getStudentActivities(user._id);
        break;
    }

    res.json(activities);
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({ message: 'Failed to fetch recent activities' });
  }
};

// Get upcoming events
const getUpcomingEvents = async (req, res) => {
  try {
    const { user } = req;
    let events = [];

    // Get events based on user role and department
    if (user.role === 'admin') {
      events = await getAdminEvents();
    } else {
      events = await getDepartmentEvents(user.department);
    }

    res.json(events);
  } catch (error) {
    console.error('Upcoming events error:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming events' });
  }
};

// Helper functions for admin statistics
const getAdminStats = async () => {
  const [
    totalDepartments,
    totalUsers,
    activeComplaints,
    publishedNotices,
    activeUsers
  ] = await Promise.all([
    Department.countDocuments(),
    User.countDocuments(),
    Complaint.countDocuments({ status: { $in: ['Open', 'In Progress', 'Under Review'] } }),
    Notice.countDocuments({ isPublished: true }),
    User.countDocuments({ status: 'active' })
  ]);

  return {
    totalDepartments,
    totalUsers,
    activeComplaints,
    publishedNotices,
    activeUsers
  };
};

// Helper functions for department admin statistics
const getDepartmentAdminStats = async (departmentId) => {
  const [
    departmentFaculty,
    departmentStudents,
    departmentClasses,
    departmentSubjects
  ] = await Promise.all([
    User.countDocuments({ department: departmentId, role: 'faculty', status: 'active' }),
    User.countDocuments({ department: departmentId, role: 'student', status: 'active' }),
    Class.countDocuments({ department: departmentId }),
    Subject.countDocuments({ department: departmentId })
  ]);

  return {
    departmentFaculty,
    departmentStudents,
    departmentClasses,
    departmentSubjects
  };
};

// Helper functions for faculty statistics
const getFacultyStats = async (facultyId) => {
  const [
    myClasses,
    myStudents,
    attendanceRate,
    pendingGrades
  ] = await Promise.all([
    Class.countDocuments({ classTeacher: facultyId }),
    User.countDocuments({ class: { $in: await Class.find({ classTeacher: facultyId }).distinct('_id') }, role: 'student' }),
    calculateAttendanceRate(facultyId),
    Grade.countDocuments({ faculty: facultyId, isSubmitted: false })
  ]);

  return {
    myClasses,
    myStudents,
    attendanceRate,
    pendingGrades,
    todaysClasses: await getTodaysClasses(facultyId),
    attendanceDue: await getAttendanceDue(facultyId),
    gradesPending: pendingGrades
  };
};

// Helper functions for student statistics
const getStudentStats = async (studentId) => {
  const student = await User.findById(studentId).populate('class department');
  
  const [
    myAttendance,
    myClasses,
    mySubjects,
    myGrades,
    averageGrade
  ] = await Promise.all([
    calculateStudentAttendance(studentId),
    Class.countDocuments({ _id: student.class?._id }),
    Subject.countDocuments({ classes: student.class?._id }),
    Grade.countDocuments({ student: studentId }),
    calculateAverageGrade(studentId)
  ]);

  return {
    myAttendance,
    myClasses,
    mySubjects,
    myGrades,
    averageGrade,
    attendanceRate: myAttendance
  };
};

// Helper functions for activities
const getAdminActivities = async () => {
  const activities = [];
  
  // Get recent notices
  const recentNotices = await Notice.find()
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(5);
  
  recentNotices.forEach(notice => {
    activities.push({
      type: 'notice',
      description: `${notice.createdBy.name} created a notice: ${notice.title}`,
      createdAt: notice.createdAt
    });
  });

  // Get recent complaints
  const recentComplaints = await Complaint.find()
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(5);
  
  recentComplaints.forEach(complaint => {
    activities.push({
      type: 'complaint',
      description: `${complaint.createdBy.name} submitted a complaint: ${complaint.title}`,
      createdAt: complaint.createdAt
    });
  });

  return activities.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
};

const getDepartmentAdminActivities = async (departmentId) => {
  const activities = [];
  
  // Get department-specific activities
  const recentNotices = await Notice.find({ 
    targetDepartments: departmentId 
  })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(5);
  
  recentNotices.forEach(notice => {
    activities.push({
      type: 'notice',
      description: `${notice.createdBy.name} created a notice: ${notice.title}`,
      createdAt: notice.createdAt
    });
  });

  return activities.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
};

const getFacultyActivities = async (facultyId) => {
  const activities = [];
  
  // Get attendance activities
  const recentAttendance = await Attendance.find({ faculty: facultyId })
    .populate('class', 'name')
    .sort({ date: -1 })
    .limit(5);
  
  recentAttendance.forEach(attendance => {
    activities.push({
      type: 'attendance',
      description: `Attendance marked for ${attendance.class.name}`,
      createdAt: attendance.createdAt
    });
  });

  // Get grade activities
  const recentGrades = await Grade.find({ faculty: facultyId })
    .populate('student', 'name')
    .populate('subject', 'name')
    .sort({ createdAt: -1 })
    .limit(5);
  
  recentGrades.forEach(grade => {
    activities.push({
      type: 'grade',
      description: `Grade submitted for ${grade.student.name} in ${grade.subject.name}`,
      createdAt: grade.createdAt
    });
  });

  return activities.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
};

const getStudentActivities = async (studentId) => {
  const activities = [];
  
  // Get attendance records
  const recentAttendance = await Attendance.find({ 
    'records.student': studentId 
  })
    .populate('class', 'name')
    .sort({ date: -1 })
    .limit(5);
  
  recentAttendance.forEach(attendance => {
    const record = attendance.records.find(r => r.student.toString() === studentId.toString());
    activities.push({
      type: 'attendance',
      description: `Attendance marked as ${record.status} for ${attendance.class.name}`,
      createdAt: attendance.createdAt
    });
  });

  // // Get grade updates
  // const recentGrades = await Grade.find({ student: studentId })
  //   .populate('subject', 'name')
  //   .sort({ createdAt: -1 })
  //   .limit(5);
  
  // recentGrades.forEach(grade => {
  //   activities.push({
  //     type: 'grade',
  //     description: `Grade received for ${grade.subject.name}: ${grade.grade}`,
  //     createdAt: grade.createdAt
  //   });
  // });

  return activities.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
};

// Helper functions for events
const getAdminEvents = async () => {
  // For admin, return system-wide events
  return [
    {
      title: 'System Maintenance',
      description: 'Scheduled maintenance window',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
    },
    {
      title: 'Academic Year Start',
      description: 'New academic year begins',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 1 month from now
    }
  ];
};

const getDepartmentEvents = async (departmentId) => {
  // Get department-specific events from notices
  const events = await Notice.find({
    targetDepartments: departmentId,
    category: 'Events',
    isPublished: true,
    scheduledFor: { $gte: new Date() }
  })
    .sort({ scheduledFor: 1 })
    .limit(5);

  return events.map(notice => ({
    title: notice.title,
    description: notice.content,
    date: notice.scheduledFor
  }));
};

// Helper functions for calculations
const calculateAttendanceRate = async (facultyId) => {
  const classes = await Class.find({ classTeacher: facultyId });
  if (classes.length === 0) return 0;

  const totalStudents = await User.countDocuments({ 
    class: { $in: classes.map(c => c._id) },
    role: 'student'
  });

  if (totalStudents === 0) return 0;

  const today = new Date();
  const attendanceRecords = await Attendance.find({
    faculty: facultyId,
    date: {
      $gte: new Date(today.getFullYear(), today.getMonth(), 1),
      $lte: today
    }
  });

  let totalAttendance = 0;
  attendanceRecords.forEach(record => {
    totalAttendance += record.records.filter(r => r.status === 'present').length;
  });

  return Math.round((totalAttendance / (totalStudents * attendanceRecords.length)) * 100) || 0;
};

const calculateStudentAttendance = async (studentId) => {
  const student = await User.findById(studentId).populate('class');
  if (!student.class) return 0;

  const today = new Date();
  const attendanceRecords = await Attendance.find({
    class: student.class._id,
    date: {
      $gte: new Date(today.getFullYear(), today.getMonth(), 1),
      $lte: today
    }
  });

  if (attendanceRecords.length === 0) return 0;

  let presentCount = 0;
  attendanceRecords.forEach(record => {
    const studentRecord = record.records?.find(r => r.student.toString() === studentId);
    if (studentRecord && studentRecord.status === 'present') {
      presentCount++;
    }
  });

  return Math.round((presentCount / attendanceRecords.length) * 100) || 0;
};

const calculateAverageGrade = async (studentId) => {
  const grades = await Grade.find({ student: studentId });
  if (grades.length === 0) return 'N/A';

  const totalGrade = grades.reduce((sum, grade) => sum + grade.grade, 0);
  return Math.round(totalGrade / grades.length);
};

const getTodaysClasses = async (facultyId) => {
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  const timetables = await Timetable.find({
    [`schedule.${dayOfWeek}`]: {
      $elemMatch: { faculty: facultyId }
    }
  });

  return timetables.length;
};

const getAttendanceDue = async (facultyId) => {
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  const timetables = await Timetable.find({
    [`schedule.${dayOfWeek}`]: {
      $elemMatch: { faculty: facultyId }
    }
  });

  const classesWithAttendance = await Attendance.find({
    faculty: facultyId,
    date: today
  }).distinct('class');

  return timetables.length - classesWithAttendance.length;
};

module.exports = {
  getDashboardStats,
  getRecentActivities,
  getUpcomingEvents
}; 