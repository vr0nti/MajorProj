const mongoose = require('mongoose');

const semesterResultSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  semester: { 
    type: String, 
    required: true 
  },
  academicYear: { 
    type: String, 
    required: true 
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department', 
    required: true 
  },
  class: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class', 
    required: true 
  },
  // Semester details
  totalCredits: { 
    type: Number, 
    default: 0 
  },
  earnedCredits: { 
    type: Number, 
    default: 0 
  },
  totalGradePoints: { 
    type: Number, 
    default: 0 
  },
  sgpa: { 
    type: Number, 
    min: 0,
    max: 10,
    default: 0 
  },
  // CGPA tracking
  cumulativeCredits: { 
    type: Number, 
    default: 0 
  },
  cumulativeGradePoints: { 
    type: Number, 
    default: 0 
  },
  cgpa: { 
    type: Number, 
    min: 0,
    max: 10,
    default: 0 
  },
  // Status
  isCompleted: { 
    type: Boolean, 
    default: false 
  },
  hasBacklog: { 
    type: Boolean, 
    default: false 
  },
  backlogSubjects: [{ 
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    reason: String 
  }],
  // Timestamps
  calculatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Ensure unique combination of student, semester, and academic year
semesterResultSchema.index({ student: 1, semester: 1, academicYear: 1 }, { unique: true });

// Calculate SGPA and CGPA
semesterResultSchema.methods.calculateResults = async function() {
  const Grade = require('./Grade');
  
  // Get all grades for this student in this semester
  const grades = await Grade.find({
    student: this.student,
    semester: this.semester,
    academicYear: this.academicYear
  }).populate('subject');
  
  let totalCredits = 0;
  let earnedCredits = 0;
  let totalGradePoints = 0;
  let hasBacklog = false;
  let backlogSubjects = [];
  
  for (const grade of grades) {
    const subjectCredits = grade.subject.credits || 3;
    totalCredits += subjectCredits;
    
    if (grade.gradePoints >= 5) { // Pass grade
      earnedCredits += subjectCredits;
      totalGradePoints += (grade.gradePoints * subjectCredits);
    } else {
      hasBacklog = true;
      backlogSubjects.push({
        subject: grade.subject._id,
        reason: `Failed with grade ${grade.grade}`
      });
    }
  }
  
  // Calculate SGPA
  this.totalCredits = totalCredits;
  this.earnedCredits = earnedCredits;
  this.totalGradePoints = totalGradePoints;
  this.sgpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  this.hasBacklog = hasBacklog;
  this.backlogSubjects = backlogSubjects;
  this.isCompleted = !hasBacklog;
  
  // Calculate CGPA
  await this.calculateCGPA();
  
  this.calculatedAt = Date.now();
  return this;
};

// Calculate CGPA from all completed semesters
semesterResultSchema.methods.calculateCGPA = async function() {
  const SemesterResult = require('./SemesterResult');
  
  // Get all completed semesters for this student up to current semester
  const completedSemesters = await SemesterResult.find({
    student: this.student,
    isCompleted: true
  }).sort({ semester: 1 });
  
  let cumulativeCredits = 0;
  let cumulativeGradePoints = 0;
  
  for (const semester of completedSemesters) {
    cumulativeCredits += semester.earnedCredits;
    cumulativeGradePoints += semester.totalGradePoints;
  }
  
  this.cumulativeCredits = cumulativeCredits;
  this.cumulativeGradePoints = cumulativeGradePoints;
  this.cgpa = cumulativeCredits > 0 ? cumulativeGradePoints / cumulativeCredits : 0;
  
  return this;
};

module.exports = mongoose.model('SemesterResult', semesterResultSchema); 