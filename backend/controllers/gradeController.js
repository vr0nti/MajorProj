const Grade = require('../models/Grade');
const SemesterResult = require('../models/SemesterResult');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Class = require('../models/Class');

// Add grade for a student
exports.addGrade = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Only faculty can add grades.' });
    }

    const { 
      studentId, 
      subjectId, 
      classId, 
      semester, 
      academicYear, 
      gradeType, 
      gradeValue, 
      maxMarks, 
      remarks 
    } = req.body;

    // Verify student exists and is in faculty's class
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Verify subject exists and faculty is assigned to it
    const subject = await Subject.findById(subjectId);
    if (!subject || !subject.faculty.includes(req.user._id)) {
      return res.status(403).json({ message: 'Subject not found or you are not assigned to this subject' });
    }

    // Verify class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if grade already exists for this student, subject, and grade type
    const existingGrade = await Grade.findOne({
      student: studentId,
      subject: subjectId,
      semester,
      academicYear,
      gradeType
    });

    if (existingGrade) {
      return res.status(400).json({ message: 'Grade already exists for this student, subject, and grade type' });
    }

    const grade = new Grade({
      student: studentId,
      subject: subjectId,
      class: classId,
      faculty: req.user._id,
      semester,
      academicYear,
      gradeType,
      gradeValue,
      maxMarks: maxMarks || 100,
      remarks
    });

    await grade.save();

    res.status(201).json({
      message: 'Grade added successfully',
      grade
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update grade
exports.updateGrade = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Only faculty can update grades.' });
    }

    const { id } = req.params;
    const { gradeValue, maxMarks, remarks } = req.body;

    const grade = await Grade.findById(id);
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    // Verify faculty owns this grade
    if (grade.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update grades you created' });
    }

    grade.gradeValue = gradeValue;
    grade.maxMarks = maxMarks || grade.maxMarks;
    grade.remarks = remarks;
    grade.updatedAt = Date.now();

    await grade.save();

    res.json({
      message: 'Grade updated successfully',
      grade
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get grades for a student
exports.getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { semester, academicYear, subjectId } = req.query;

    let query = { student: studentId };

    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;
    if (subjectId) query.subject = subjectId;

    const grades = await Grade.find(query)
      .populate('subject', 'name code')
      .populate('faculty', 'name')
      .populate('class', 'name')
      .sort({ createdAt: -1 });

    res.json(grades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get grades for a class (faculty view)
exports.getClassGrades = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Only faculty can view class grades.' });
    }

    const { classId, subjectId, semester, academicYear } = req.query;

    let query = { faculty: req.user._id };

    if (classId) query.class = classId;
    if (subjectId) query.subject = subjectId;
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    const grades = await Grade.find(query)
      .populate('student', 'name rollNumber')
      .populate('subject', 'name code')
      .populate('class', 'name')
      .sort({ 'student.name': 1, gradeType: 1 });

    res.json(grades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete grade
exports.deleteGrade = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Only faculty can delete grades.' });
    }

    const { id } = req.params;

    const grade = await Grade.findById(id);
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    // Verify faculty owns this grade
    if (grade.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete grades you created' });
    }

    await Grade.findByIdAndDelete(id);

    res.json({ message: 'Grade deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get grade statistics
exports.getGradeStatistics = async (req, res) => {
  try {
    const { classId, subjectId, semester, academicYear } = req.query;

    let query = { faculty: req.user._id };

    if (classId) query.class = classId;
    if (subjectId) query.subject = subjectId;
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    const grades = await Grade.find(query);

    const statistics = {
      totalGrades: grades.length,
      averageGrade: grades.length > 0 ? grades.reduce((sum, grade) => sum + grade.percentage, 0) / grades.length : 0,
      highestGrade: grades.length > 0 ? Math.max(...grades.map(g => g.percentage)) : 0,
      lowestGrade: grades.length > 0 ? Math.min(...grades.map(g => g.percentage)) : 0,
      gradeDistribution: {
        'A+ (90-100)': grades.filter(g => g.percentage >= 90).length,
        'A (80-89)': grades.filter(g => g.percentage >= 80 && g.percentage < 90).length,
        'B+ (70-79)': grades.filter(g => g.percentage >= 70 && g.percentage < 80).length,
        'B (60-69)': grades.filter(g => g.percentage >= 60 && g.percentage < 70).length,
        'C+ (50-59)': grades.filter(g => g.percentage >= 50 && g.percentage < 60).length,
        'C (40-49)': grades.filter(g => g.percentage >= 40 && g.percentage < 50).length,
        'F (<40)': grades.filter(g => g.percentage < 40).length
      }
    };

    res.json(statistics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add mid exam marks (Faculty)
exports.addMidExamMarks = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Only faculty can add mid exam marks.' });
    }

    const { 
      studentId, 
      subjectId, 
      classId, 
      semester, 
      academicYear, 
      examNumber, // 1 or 2
      marks 
    } = req.body;

    // Validate exam number
    if (![1, 2].includes(examNumber)) {
      return res.status(400).json({ message: 'Exam number must be 1 or 2' });
    }

    // Validate marks
    if (marks < 0 || marks > 40) {
      return res.status(400).json({ message: 'Mid exam marks must be between 0 and 40' });
    }

    // Verify student exists and is in faculty's class
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Verify subject exists and faculty is assigned to it
    const subject = await Subject.findById(subjectId);
    if (!subject || !subject.faculty.includes(req.user._id)) {
      return res.status(403).json({ message: 'Subject not found or you are not assigned to this subject' });
    }

    // Verify class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Find or create grade record
    let grade = await Grade.findOne({
      student: studentId,
      subject: subjectId,
      semester,
      academicYear
    });

    if (!grade) {
      grade = new Grade({
        student: studentId,
        subject: subjectId,
        class: classId,
        faculty: req.user._id,
        semester,
        academicYear
      });
    }

    // Update the appropriate mid exam marks
    if (examNumber === 1) {
      grade.midExam1 = marks;
    } else {
      grade.midExam2 = marks;
    }

    await grade.save();

    res.status(201).json({
      message: `Mid exam ${examNumber} marks added successfully`,
      grade
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add external marks (Department Admin)
exports.addExternalMarks = async (req, res) => {
  try {
    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied. Only department admin can add external marks.' });
    }

    const { 
      studentId, 
      subjectId, 
      classId, 
      semester, 
      academicYear, 
      marks 
    } = req.body;

    // Validate marks
    if (marks < 0 || marks > 60) {
      return res.status(400).json({ message: 'External marks must be between 0 and 60' });
    }

    // Verify student exists and belongs to admin's department
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student' || student.department.toString() !== req.user.department.toString()) {
      return res.status(404).json({ message: 'Student not found or not in your department' });
    }

    // Verify subject exists and belongs to admin's department
    const subject = await Subject.findById(subjectId);
    if (!subject || subject.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({ message: 'Subject not found or not in your department' });
    }

    // Verify class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Find or create grade record
    let grade = await Grade.findOne({
      student: studentId,
      subject: subjectId,
      semester,
      academicYear
    });

    if (!grade) {
      grade = new Grade({
        student: studentId,
        subject: subjectId,
        class: classId,
        faculty: subject.faculty[0], // Assign to first faculty
        semester,
        academicYear
      });
    }

    grade.externalMarks = marks;
    await grade.save();

    // Calculate semester results
    await calculateSemesterResults(studentId, semester, academicYear);

    res.status(201).json({
      message: 'External marks added successfully',
      grade
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Calculate semester results (SGPA and CGPA)
const calculateSemesterResults = async (studentId, semester, academicYear) => {
  try {
    const student = await User.findById(studentId);
    if (!student) return;

    // Find or create semester result
    let semesterResult = await SemesterResult.findOne({
      student: studentId,
      semester,
      academicYear
    });

    if (!semesterResult) {
      semesterResult = new SemesterResult({
        student: studentId,
        semester,
        academicYear,
        department: student.department,
        class: student.class
      });
    }

    // Calculate results
    await semesterResult.calculateResults();
    await semesterResult.save();

    return semesterResult;
  } catch (err) {
    console.error('Error calculating semester results:', err);
  }
};

// Get semester results for a student
exports.getSemesterResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { semester, academicYear } = req.query;

    let query = { student: studentId };
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    const results = await SemesterResult.find(query)
      .populate('department', 'name')
      .populate('class', 'name')
      .sort({ semester: 1 });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get detailed grades for a student
exports.getStudentDetailedGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { semester, academicYear } = req.query;

    let query = { student: studentId };
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    const grades = await Grade.find(query)
      .populate('subject', 'name code credits')
      .populate('faculty', 'name')
      .populate('class', 'name')
      .sort({ 'subject.name': 1 });

    // Group by subject
    const groupedGrades = grades.reduce((acc, grade) => {
      const subjectKey = grade.subject._id.toString();
      if (!acc[subjectKey]) {
        acc[subjectKey] = {
          subject: grade.subject,
          midExam1: null,
          midExam2: null,
          internalMarks: null,
          externalMarks: null,
          totalMarks: null,
          grade: null,
          gradePoints: null,
          faculty: grade.faculty
        };
      }
      
      // Update with latest values
      if (grade.midExam1 !== null) acc[subjectKey].midExam1 = grade.midExam1;
      if (grade.midExam2 !== null) acc[subjectKey].midExam2 = grade.midExam2;
      if (grade.internalMarks !== null) acc[subjectKey].internalMarks = grade.internalMarks;
      if (grade.externalMarks !== null) acc[subjectKey].externalMarks = grade.externalMarks;
      if (grade.totalMarks !== null) acc[subjectKey].totalMarks = grade.totalMarks;
      if (grade.grade !== null) acc[subjectKey].grade = grade.grade;
      if (grade.gradePoints !== null) acc[subjectKey].gradePoints = grade.gradePoints;
      
      return acc;
    }, {});

    res.json(Object.values(groupedGrades));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get grades for faculty to manage
exports.getFacultyGrades = async (req, res) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied. Only faculty can view faculty grades.' });
    }

    const { classId, subjectId, semester, academicYear } = req.query;

    let query = {  };

    if (classId) query.class = classId;
    if (subjectId) query.subject = subjectId;
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    console.log(query);

    const grades = await Grade.find(query)
      .populate('student', 'name rollNumber')
      .populate('subject', 'name code')
      .populate('class', 'name')
      .sort({ 'student.name': 1 });

    res.json(grades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update mid exam marks
exports.updateMidExamMarks = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Only faculty can update mid exam marks.' });
    }

    const { id } = req.params;
    const { examNumber, marks } = req.body;

    if (![1, 2].includes(examNumber)) {
      return res.status(400).json({ message: 'Exam number must be 1 or 2' });
    }

    if (marks < 0 || marks > 40) {
      return res.status(400).json({ message: 'Mid exam marks must be between 0 and 40' });
    }

    const grade = await Grade.findById(id);
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    if (grade.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update grades you created' });
    }

    if (examNumber === 1) {
      grade.midExam1 = marks;
    } else {
      grade.midExam2 = marks;
    }

    await grade.save();

    res.json({
      message: `Mid exam ${examNumber} marks updated successfully`,
      grade
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update external marks
exports.updateExternalMarks = async (req, res) => {
  try {
    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied. Only department admin can update external marks.' });
    }

    const { id } = req.params;
    const { marks } = req.body;

    if (marks < 0 || marks > 60) {
      return res.status(400).json({ message: 'External marks must be between 0 and 60' });
    }

    const grade = await Grade.findById(id);
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    grade.externalMarks = marks;
    await grade.save();

    // Recalculate semester results
    await calculateSemesterResults(grade.student, grade.semester, grade.academicYear);

    res.json({
      message: 'External marks updated successfully',
      grade
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper: R22 grade points
const getR22GradePoint = (percentage) => {
  if (percentage >= 90) return 10; // S
  if (percentage >= 80) return 9;  // A+
  if (percentage >= 70) return 8;  // A
  if (percentage >= 60) return 7;  // B+
  if (percentage >= 50) return 6;  // B
  if (percentage >= 40) return 5;  // P
  return 0; // F
};

// Helper: R22 pass criteria for B.Tech
const isR22Pass = (cie, see, total) => {
  return cie >= 14 && see >= 21 && total >= 40; // 35% of 40 = 14, 35% of 60 = 21, 40% overall
};

exports.releaseSemesterGrades = async (req, res) => {
  try {
    if (req.user.role !== 'departmentAdmin') {
      return res.status(403).json({ message: 'Access denied. Only department admin can release grades.' });
    }
    
    const { semester, academicYear } = req.body;
    if (!semester || !academicYear) {
      return res.status(400).json({ message: 'Semester and academic year are required.' });
    }

    // Get all students in this department
    const students = await User.find({ department: req.user.department, role: 'student' });
    let updatedCount = 0;
    // console.log("students",students);
    console.log("semester",semester);
    console.log("academicYear",academicYear);
    for (const student of students) {
      // Get all grades for this student in this semester
      console.log("student",student._id);
      const grades = await Grade.find({ 
        student: student._id,
        semester, 
        academicYear 
      }).populate('subject');
      console.log("grades",grades);
      if (grades.length === 0) continue;

      let allPassed = true;
      let totalCredits = 0;
      let totalGradePoints = 0;

      // Group grades by subject
      const subjectGroups = {};
      grades.forEach(grade => {
        const subjectId = grade.subject._id.toString();
        if (!subjectGroups[subjectId]) {
          subjectGroups[subjectId] = [];
        }
        subjectGroups[subjectId].push(grade);
      });

      // Process each subject
      for (const [subjectId, subjectGrades] of Object.entries(subjectGroups)) {
        // Use the first grade entry for subject info (they should all be the same subject)
        const firstGrade = subjectGrades[0];
        const subject = firstGrade.subject;
        const credits = subject.credits || 3;

        // Check if all required marks are present
        const hasInternalMarks = firstGrade.internalMarks !== null && firstGrade.internalMarks !== undefined;
        const hasExternalMarks = firstGrade.externalMarks !== null && firstGrade.externalMarks !== undefined;
        const hasTotalMarks = firstGrade.totalMarks !== null && firstGrade.totalMarks !== undefined;

        if (!hasInternalMarks || !hasExternalMarks || !hasTotalMarks) {
          allPassed = false;
          continue;
        }

        // R22 pass criteria: CIE >= 14 (35% of 40), SEE >= 21 (35% of 60), Total >= 40 (40% of 100)
        const cie = firstGrade.internalMarks;
        const see = firstGrade.externalMarks;
        const total = firstGrade.totalMarks;

        if (!isR22Pass(cie, see, total)) {
          allPassed = false;
        }

        // Calculate grade point for this subject
        const percentage = total; // total is already out of 100
        const gradePoint = getR22GradePoint(percentage);
        
        totalCredits += credits;
        totalGradePoints += (gradePoint * credits);
      }

      // Update student grades array for this semester
      let gradesArr = student.grades || [];
      let semesterIndex = gradesArr.findIndex(g => g.semester === semester);
      
      if (semesterIndex === -1) {
        gradesArr.push({ 
          semester, 
          isSemesterCompleted: false, 
          sgpa: 0, 
          released: false 
        });
        semesterIndex = gradesArr.length - 1;
      }

      if (allPassed && totalCredits > 0) {
        const sgpa = totalGradePoints / totalCredits;
        gradesArr[semesterIndex].sgpa = parseFloat(sgpa.toFixed(2));
      } else {
        gradesArr[semesterIndex].sgpa = 0;

      }
      gradesArr[semesterIndex].isSemesterCompleted = true;
      
      gradesArr[semesterIndex].released = true;

      // Update CGPA (average of completed and released SGPAs)
      const completed = gradesArr.filter(g => g.isSemesterCompleted && g.released);
      let cgpa = 0;
      if (completed.length > 0) {
        cgpa = completed.reduce((sum, g) => sum + g.sgpa, 0) / completed.length;
      }

      student.grades = gradesArr;
      student.cgpa = parseFloat(cgpa.toFixed(2));
      await student.save();
      updatedCount++;
    }

    res.json({ 
      message: `Grades released for semester ${semester} (${academicYear}). Updated ${updatedCount} students.` 
    });
  } catch (err) {
    console.error('Release semester grades error:', err);
    res.status(500).json({ message: 'Failed to release semester grades.' });
  }
}; 