const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Department = require('../models/Department');

/**
 * TIMETABLE OPTIMIZATION - CLEAN IMPLEMENTATION
 * 
 * Features:
 * 1. View timetables by class/semester
 * 2. Intelligent text-based suggestions
 * 3. Consistent analytics across tabs
 */

// ==================== 1. TIMETABLE DISPLAY ====================

/**
 * Get timetables filtered by semester
 * @route GET /api/timetable/optimize/view
 * @access Department Admin
 */
exports.getTimetablesBySemester = async (req, res) => {
  try {
    const { semester, classId } = req.query;
    
    // Validate user is department admin
    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Department admin only.'
      });
    }

    // Build query
    const query = { department: req.user.department };
    if (semester) query.semester = semester;
    if (classId) query.class = classId;

    // Fetch timetables with all necessary data
    const timetables = await Timetable.find(query)
      .populate({
        path: 'class',
        select: 'name fullName semester academicYear capacity currentStrength',
        populate: {
          path: 'subjects.subject subjects.faculty',
          select: 'name code credits type specialization'
        }
      })
      .populate({
        path: 'schedule.periods.subject',
        select: 'name code credits type'
      })
      .populate({
        path: 'schedule.periods.faculty',
        select: 'name email specialization'
      })
      .sort({ semester: 1, createdAt: -1 });

    // Get all classes for filter options
    const allClasses = await Class.find({ 
      department: req.user.department,
      status: 'active' 
    })
      .select('name fullName semester academicYear')
      .sort({ semester: 1, name: 1 });

    // Get unique semesters
    const semesters = [...new Set(allClasses.map(c => c.semester))].sort();

    // Calculate statistics for each timetable
    const timetablesWithStats = timetables.map(tt => {
      const stats = calculateTimetableStats(tt);
      return {
        _id: tt._id,
        class: tt.class,
        semester: tt.semester,
        academicYear: tt.academicYear,
        schedule: tt.schedule,
        status: tt.status,
        statistics: stats,
        createdAt: tt.createdAt,
        updatedAt: tt.updatedAt
      };
    });

    res.json({
      success: true,
      data: {
        timetables: timetablesWithStats,
        filters: {
          semesters,
          classes: allClasses
        },
        count: timetablesWithStats.length
      }
    });

  } catch (error) {
    console.error('Error fetching timetables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetables',
      error: error.message
    });
  }
};

// ==================== 2. INTELLIGENT SUGGESTIONS ====================

/**
 * Generate intelligent text-based suggestions
 * @route POST /api/timetable/optimize/suggestions
 * @access Department Admin
 */
exports.generateIntelligentSuggestions = async (req, res) => {
  try {
    const { classId, analysisType = 'comprehensive' } = req.body;

    // Validate access
    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Department admin only.'
      });
    }

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }

    // Fetch class data with all relationships
    const classData = await Class.findById(classId)
      .populate({
        path: 'subjects.subject',
        select: 'name code credits type description'
      })
      .populate({
        path: 'subjects.faculty',
        select: 'name email specialization experience'
      })
      .populate('department', 'name code')
      .populate('students', 'name rollNumber');

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Verify department access
    if (classData.department._id.toString() !== req.user.department.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Class not in your department.'
      });
    }

    // Get current timetable
    const timetable = await Timetable.findOne({ class: classId })
      .populate('schedule.periods.subject', 'name code credits type')
      .populate('schedule.periods.faculty', 'name email specialization');

    // Get all department faculty for analysis
    const allFaculty = await User.find({
      department: req.user.department,
      role: 'faculty'
    }).select('name email specialization experience subjects');

    // Get all department timetables for broader analysis
    const allTimetables = await Timetable.find({ department: req.user.department })
      .populate('class', 'name fullName semester')
      .populate('schedule.periods.subject', 'name code')
      .populate('schedule.periods.faculty', 'name email');

    // Generate intelligent suggestions
    const suggestions = await generateIntelligentAnalysis({
      classData,
      timetable,
      allFaculty,
      allTimetables,
      analysisType
    });

    res.json({
      success: true,
      data: {
        class: {
          id: classData._id,
          name: classData.fullName,
          semester: classData.semester,
          studentCount: classData.students.length,
          capacity: classData.capacity
        },
        suggestions,
        generatedAt: new Date(),
        analysisType
      }
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate suggestions',
      error: error.message
    });
  }
};

// ==================== 3. COMPREHENSIVE ANALYTICS ====================

/**
 * Get comprehensive analytics for department
 * @route GET /api/timetable/optimize/analytics
 * @access Department Admin
 */
exports.getComprehensiveAnalytics = async (req, res) => {
  try {
    // Validate access
    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Department admin only.'
      });
    }

    // Get all department data
    const [classes, timetables, faculty, department] = await Promise.all([
      Class.find({ department: req.user.department })
        .populate('subjects.subject subjects.faculty')
        .populate('students'),
      Timetable.find({ department: req.user.department })
        .populate('class', 'name fullName semester')
        .populate('schedule.periods.subject', 'name code credits')
        .populate('schedule.periods.faculty', 'name email'),
      User.find({ department: req.user.department, role: 'faculty' })
        .select('name email specialization experience subjects'),
      Department.findById(req.user.department)
    ]);

    // Calculate comprehensive analytics
    const analytics = {
      overview: {
        totalClasses: classes.length,
        totalTimetables: timetables.length,
        totalFaculty: faculty.length,
        totalStudents: classes.reduce((sum, c) => sum + (c.students?.length || 0), 0),
        departmentName: department?.name || 'Unknown'
      },
      facultyWorkload: calculateFacultyWorkload(timetables, faculty),
      roomUtilization: calculateRoomUtilization(timetables),
      scheduleHealth: calculateScheduleHealth(timetables, classes),
      subjectDistribution: calculateSubjectDistribution(classes, timetables),
      recommendations: generateDepartmentRecommendations(timetables, classes, faculty)
    };

    res.json({
      success: true,
      data: analytics,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics',
      error: error.message
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate statistics for a single timetable
 */
function calculateTimetableStats(timetable) {
  const stats = {
    totalPeriods: 0,
    classPeriods: 0,
    breakPeriods: 0,
    subjects: new Set(),
    faculty: new Set(),
    rooms: new Set(),
    days: timetable.schedule.length,
    conflicts: []
  };

  timetable.schedule.forEach(day => {
    day.periods.forEach(period => {
      stats.totalPeriods++;
      
      if (period.type === 'class') {
        stats.classPeriods++;
        if (period.subject) stats.subjects.add(period.subject._id?.toString() || period.subject.toString());
        if (period.faculty) stats.faculty.add(period.faculty._id?.toString() || period.faculty.toString());
        if (period.room) stats.rooms.add(period.room);
      } else if (period.type === 'break' || period.type === 'lunch') {
        stats.breakPeriods++;
      }
    });
  });

  return {
    totalPeriods: stats.totalPeriods,
    classPeriods: stats.classPeriods,
    breakPeriods: stats.breakPeriods,
    uniqueSubjects: stats.subjects.size,
    uniqueFaculty: stats.faculty.size,
    uniqueRooms: stats.rooms.size,
    daysScheduled: stats.days,
    utilizationRate: stats.totalPeriods > 0 ? ((stats.classPeriods / stats.totalPeriods) * 100).toFixed(1) : 0
  };
}

/**
 * Generate intelligent analysis and suggestions
 */
async function generateIntelligentAnalysis({ classData, timetable, allFaculty, allTimetables, analysisType }) {
  const suggestions = [];

  // 1. Faculty Assignment Analysis
  const unassignedSubjects = classData.subjects.filter(s => !s.faculty);
  if (unassignedSubjects.length > 0) {
    unassignedSubjects.forEach(subj => {
      const subject = subj.subject;
      const suitableFaculty = allFaculty.filter(f => 
        f.specialization && subject?.name && 
        f.specialization.toLowerCase().includes(subject.name.toLowerCase().split(' ')[0])
      );

      suggestions.push({
        category: 'Faculty Assignment',
        priority: 'high',
        issue: `Subject "${subject?.name || 'Unknown'}" has no assigned faculty`,
        suggestion: suitableFaculty.length > 0
          ? `Assign one of these qualified faculty: ${suitableFaculty.map(f => f.name).join(', ')}`
          : `No faculty with matching specialization found. Consider hiring or training existing faculty for ${subject?.name}`,
        impact: 'Critical - Students cannot have classes without faculty',
        actionable: true,
        details: {
          subjectCode: subject?.code,
          subjectCredits: subject?.credits,
          recommendedFaculty: suitableFaculty.map(f => ({
            name: f.name,
            specialization: f.specialization,
            experience: f.experience
          }))
        }
      });
    });
  }

  // 2. Timetable Structure Analysis
  if (timetable) {
    const stats = calculateTimetableStats(timetable);
    
    if (stats.utilizationRate < 60) {
      suggestions.push({
        category: 'Schedule Efficiency',
        priority: 'medium',
        issue: `Low timetable utilization at ${stats.utilizationRate}%`,
        suggestion: 'Consider adding more classes or consolidating schedule to improve efficiency. Analyze if all time slots are being used effectively.',
        impact: 'Optimization opportunity - Better resource utilization possible',
        actionable: true,
        details: {
          currentUtilization: stats.utilizationRate,
          totalPeriods: stats.totalPeriods,
          classPeriods: stats.classPeriods,
          wastedSlots: stats.totalPeriods - stats.classPeriods
        }
      });
    }

    // Check for heavy days
    const periodsPerDay = timetable.schedule.map(day => ({
      day: day.day,
      count: day.periods.filter(p => p.type === 'class').length
    }));
    
    const maxPeriods = Math.max(...periodsPerDay.map(d => d.count));
    const minPeriods = Math.min(...periodsPerDay.map(d => d.count));
    
    if (maxPeriods - minPeriods > 3) {
      suggestions.push({
        category: 'Workload Balance',
        priority: 'medium',
        issue: 'Uneven distribution of classes across days',
        suggestion: `Some days have ${maxPeriods} classes while others have only ${minPeriods}. Redistribute classes more evenly to prevent student fatigue and improve learning outcomes.`,
        impact: 'Student wellbeing and learning effectiveness',
        actionable: true,
        details: {
          dailyDistribution: periodsPerDay,
          recommendation: 'Aim for 5-6 classes per day for optimal learning'
        }
      });
    }
  } else {
    suggestions.push({
      category: 'Timetable Creation',
      priority: 'critical',
      issue: 'No timetable exists for this class',
      suggestion: 'Create a new timetable for this class immediately. Students cannot attend classes without a schedule.',
      impact: 'Critical - No classes can be conducted',
      actionable: true,
      details: {
        subjectCount: classData.subjects.length,
        studentCount: classData.students.length,
        recommendedAction: 'Use the timetable creation form to build a schedule'
      }
    });
  }

  // 3. Faculty Workload Analysis
  const facultyWorkloadMap = new Map();
  allTimetables.forEach(tt => {
    tt.schedule.forEach(day => {
      day.periods.forEach(period => {
        if (period.faculty && period.type === 'class') {
          const facId = period.faculty._id?.toString() || period.faculty.toString();
          const facName = period.faculty.name || 'Unknown';
          if (!facultyWorkloadMap.has(facId)) {
            facultyWorkloadMap.set(facId, { name: facName, periods: 0, subjects: new Set() });
          }
          const data = facultyWorkloadMap.get(facId);
          data.periods++;
          if (period.subject) data.subjects.add(period.subject._id?.toString() || period.subject.toString());
        }
      });
    });
  });

  const overloadedFaculty = Array.from(facultyWorkloadMap.entries())
    .filter(([_, data]) => data.periods > 30)
    .map(([id, data]) => ({ id, ...data }));

  const underloadedFaculty = allFaculty.filter(f => {
    const facId = f._id.toString();
    return !facultyWorkloadMap.has(facId) || facultyWorkloadMap.get(facId).periods < 15;
  });

  if (overloadedFaculty.length > 0) {
    suggestions.push({
      category: 'Faculty Workload',
      priority: 'high',
      issue: `${overloadedFaculty.length} faculty members are overloaded`,
      suggestion: `Redistribute workload from overloaded faculty: ${overloadedFaculty.map(f => `${f.name} (${f.periods} periods)`).join(', ')}. Consider assigning some of their classes to underloaded faculty or hiring additional faculty.`,
      impact: 'Faculty burnout risk, teaching quality may decrease',
      actionable: true,
      details: {
        overloadedFaculty: overloadedFaculty.map(f => ({
          name: f.name,
          periods: f.periods,
          subjectCount: f.subjects.size,
          recommendation: 'Reduce to 25-30 periods maximum'
        })),
        underloadedFaculty: underloadedFaculty.map(f => ({
          name: f.name,
          specialization: f.specialization,
          currentLoad: facultyWorkloadMap.get(f._id.toString())?.periods || 0
        }))
      }
    });
  }

  // 4. Subject Credit Distribution
  const totalCredits = classData.subjects.reduce((sum, s) => sum + (s.subject?.credits || 0), 0);
  const avgCreditsPerWeek = totalCredits / (classData.subjects.length || 1);
  
  if (totalCredits < 18 || totalCredits > 25) {
    suggestions.push({
      category: 'Academic Standards',
      priority: 'medium',
      issue: `Total credits (${totalCredits}) is ${totalCredits < 18 ? 'below' : 'above'} standard range`,
      suggestion: totalCredits < 18 
        ? 'Consider adding more subjects or increasing credit hours to meet academic standards (typically 18-24 credits per semester)'
        : 'Consider if the credit load is too heavy for students. Standard range is 18-24 credits per semester',
      impact: 'Academic standards and student workload balance',
      actionable: false,
      details: {
        totalCredits,
        subjectCount: classData.subjects.length,
        averageCredits: avgCreditsPerWeek.toFixed(1),
        standardRange: '18-24 credits per semester'
      }
    });
  }

  // 5. Room Utilization (if timetable exists)
  if (timetable) {
    const rooms = new Map();
    timetable.schedule.forEach(day => {
      day.periods.forEach(period => {
        if (period.room && period.type === 'class') {
          if (!rooms.has(period.room)) {
            rooms.set(period.room, { count: 0, days: new Set() });
          }
          const roomData = rooms.get(period.room);
          roomData.count++;
          roomData.days.add(day.day);
        }
      });
    });

    if (rooms.size === 1) {
      const [roomName, data] = Array.from(rooms.entries())[0];
      suggestions.push({
        category: 'Room Allocation',
        priority: 'low',
        issue: `All classes assigned to single room: ${roomName}`,
        suggestion: 'Consider using different rooms for different subject types (theory vs lab). This provides variety and may be more suitable for specific subjects.',
        impact: 'Resource optimization and subject-specific facilities',
        actionable: true,
        details: {
          currentRoom: roomName,
          usage: data.count + ' periods',
          recommendation: 'Use lab rooms for practical subjects, theory rooms for lectures'
        }
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

/**
 * Calculate faculty workload across department
 */
function calculateFacultyWorkload(timetables, faculty) {
  const workloadMap = new Map();

  // Initialize all faculty
  faculty.forEach(f => {
    workloadMap.set(f._id.toString(), {
      facultyId: f._id,
      name: f.name,
      email: f.email,
      specialization: f.specialization,
      totalPeriods: 0,
      totalHours: 0,
      classes: new Set(),
      subjects: new Set()
    });
  });

  // Count periods from timetables
  timetables.forEach(tt => {
    tt.schedule.forEach(day => {
      day.periods.forEach(period => {
        if (period.faculty && period.type === 'class') {
          const facId = period.faculty._id?.toString() || period.faculty.toString();
          if (workloadMap.has(facId)) {
            const data = workloadMap.get(facId);
            data.totalPeriods++;
            data.totalHours += 1; // Assuming 1 hour per period
            data.classes.add(tt.class._id.toString());
            if (period.subject) {
              data.subjects.add(period.subject._id?.toString() || period.subject.toString());
            }
          }
        }
      });
    });
  });

  const workloadArray = Array.from(workloadMap.values()).map(w => ({
    ...w,
    classes: w.classes.size,
    subjects: w.subjects.size,
    workloadLevel: w.totalPeriods > 30 ? 'Overloaded' : w.totalPeriods > 20 ? 'Optimal' : w.totalPeriods > 10 ? 'Moderate' : 'Underutilized'
  }));

  return {
    faculty: workloadArray.sort((a, b) => b.totalPeriods - a.totalPeriods),
    summary: {
      totalFaculty: workloadArray.length,
      averageLoad: (workloadArray.reduce((sum, f) => sum + f.totalPeriods, 0) / workloadArray.length).toFixed(1),
      overloaded: workloadArray.filter(f => f.totalPeriods > 30).length,
      underutilized: workloadArray.filter(f => f.totalPeriods < 10).length
    }
  };
}

/**
 * Calculate room utilization
 */
function calculateRoomUtilization(timetables) {
  const roomMap = new Map();

  timetables.forEach(tt => {
    tt.schedule.forEach(day => {
      day.periods.forEach(period => {
        if (period.room && period.type === 'class') {
          if (!roomMap.has(period.room)) {
            roomMap.set(period.room, {
              room: period.room,
              periods: 0,
              days: new Set(),
              classes: new Set()
            });
          }
          const data = roomMap.get(period.room);
          data.periods++;
          data.days.add(day.day);
          data.classes.add(tt.class._id.toString());
        }
      });
    });
  });

  const utilizationArray = Array.from(roomMap.values()).map(r => ({
    room: r.room,
    totalPeriods: r.periods,
    daysUsed: r.days.size,
    classesUsing: r.classes.size,
    utilizationRate: ((r.periods / (6 * 8)) * 100).toFixed(1) // 6 days, 8 periods per day max
  }));

  return {
    rooms: utilizationArray.sort((a, b) => b.totalPeriods - a.totalPeriods),
    summary: {
      totalRooms: utilizationArray.length,
      averageUtilization: (utilizationArray.reduce((sum, r) => sum + parseFloat(r.utilizationRate), 0) / utilizationArray.length).toFixed(1),
      mostUsed: utilizationArray[0]?.room || 'N/A',
      leastUsed: utilizationArray[utilizationArray.length - 1]?.room || 'N/A'
    }
  };
}

/**
 * Calculate overall schedule health
 */
function calculateScheduleHealth(timetables, classes) {
  const totalClasses = classes.length;
  const classesWithTimetables = timetables.length;
  const completionRate = totalClasses > 0 ? ((classesWithTimetables / totalClasses) * 100).toFixed(1) : 0;

  let totalUtilization = 0;
  let conflictCount = 0;

  timetables.forEach(tt => {
    const stats = calculateTimetableStats(tt);
    totalUtilization += parseFloat(stats.utilizationRate);
  });

  const avgUtilization = timetables.length > 0 ? (totalUtilization / timetables.length).toFixed(1) : 0;

  return {
    completionRate: parseFloat(completionRate),
    averageUtilization: parseFloat(avgUtilization),
    totalTimetables: timetables.length,
    totalClasses: totalClasses,
    pendingClasses: totalClasses - classesWithTimetables,
    healthScore: calculateHealthScore(completionRate, avgUtilization),
    status: completionRate > 90 ? 'Excellent' : completionRate > 70 ? 'Good' : completionRate > 50 ? 'Fair' : 'Needs Attention'
  };
}

/**
 * Calculate health score
 */
function calculateHealthScore(completionRate, utilizationRate) {
  const score = (parseFloat(completionRate) * 0.6) + (parseFloat(utilizationRate) * 0.4);
  return Math.min(100, Math.max(0, score)).toFixed(1);
}

/**
 * Calculate subject distribution
 */
function calculateSubjectDistribution(classes, timetables) {
  const subjectMap = new Map();

  classes.forEach(cls => {
    cls.subjects.forEach(subj => {
      const subject = subj.subject;
      if (subject) {
        const subId = subject._id?.toString() || subject.toString();
        if (!subjectMap.has(subId)) {
          subjectMap.set(subId, {
            name: subject.name || 'Unknown',
            code: subject.code || 'N/A',
            type: subject.type || 'theory',
            credits: subject.credits || 0,
            classes: 0,
            hasFaculty: 0
          });
        }
        const data = subjectMap.get(subId);
        data.classes++;
        if (subj.faculty) data.hasFaculty++;
      }
    });
  });

  const distributionArray = Array.from(subjectMap.values());

  return {
    subjects: distributionArray.sort((a, b) => b.classes - a.classes),
    summary: {
      totalSubjects: distributionArray.length,
      theorySubjects: distributionArray.filter(s => s.type === 'theory').length,
      labSubjects: distributionArray.filter(s => s.type === 'lab').length,
      averageCredits: (distributionArray.reduce((sum, s) => sum + s.credits, 0) / distributionArray.length).toFixed(1)
    }
  };
}

/**
 * Generate department-level recommendations
 */
function generateDepartmentRecommendations(timetables, classes, faculty) {
  const recommendations = [];

  // Check timetable completion
  const missingTimetables = classes.length - timetables.length;
  if (missingTimetables > 0) {
    recommendations.push({
      type: 'critical',
      title: 'Incomplete Timetable Coverage',
      message: `${missingTimetables} class(es) do not have timetables. Create timetables for all classes immediately.`,
      action: 'Create missing timetables'
    });
  }

  // Check faculty utilization
  const facultyWorkload = calculateFacultyWorkload(timetables, faculty);
  if (facultyWorkload.summary.underutilized > facultyWorkload.summary.totalFaculty * 0.3) {
    recommendations.push({
      type: 'medium',
      title: 'Underutilized Faculty',
      message: `${facultyWorkload.summary.underutilized} faculty members are underutilized. Consider assigning them additional classes or subjects.`,
      action: 'Review faculty assignments'
    });
  }

  // Check room utilization
  const roomUtil = calculateRoomUtilization(timetables);
  if (roomUtil.summary.totalRooms < 3) {
    recommendations.push({
      type: 'low',
      title: 'Limited Room Usage',
      message: `Only ${roomUtil.summary.totalRooms} rooms are being used. Consider utilizing more rooms for better distribution.`,
      action: 'Review room allocations'
    });
  }

  return recommendations;
}

module.exports = exports;
