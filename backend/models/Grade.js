const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  subject: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject', 
    required: true 
  },
  class: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class', 
    required: true 
  },
  faculty: { 
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
  // New grading system fields
  midExam1: { 
    type: Number, 
    min: 0,
    max: 40,
    default: null
  },
  midExam2: { 
    type: Number, 
    min: 0,
    max: 40,
    default: null
  },
  internalMarks: { 
    type: Number, 
    min: 0,
    max: 40,
    default: null
  },
  externalMarks: { 
    type: Number, 
    min: 0,
    max: 60,
    default: null
  },
  totalMarks: { 
    type: Number, 
    min: 0,
    max: 100,
    default: null
  },
  grade: { 
    type: String, 
    enum: ['S', 'A+', 'A', 'B+', 'B','P','F','AB', null],
    default: null
  },
  gradePoints: { 
    type: Number, 
    min: 0,
    max: 10,
    default: null
  },
  // Legacy fields for backward compatibility
  gradeType: { 
    type: String, 
    enum: ['assignment', 'midterm', 'final', 'project', 'quiz'], 
    required: false 
  },
  gradeValue: { 
    type: Number, 
    min: 0,
    max: 100,
    required: false
  },
  maxMarks: { 
    type: Number, 
    default: 100 
  },
  percentage: { 
    type: Number,
    min: 0,
    max: 100
  },
  remarks: { 
    type: String 
  },
  submittedAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Calculate internal marks from mid exams
gradeSchema.pre('save', function(next) {
  // Calculate internal marks from mid exams
  if (this.midExam1 !== null && this.midExam2 !== null) {
    this.internalMarks = Math.round((this.midExam1 + this.midExam2) / 2);
  }
  
  // Calculate total marks
  if (this.internalMarks !== null && this.externalMarks !== null) {
    this.totalMarks = this.internalMarks + this.externalMarks;
    // Calculate grade and grade points (R22)
    if (this.totalMarks >= 90) {
      this.grade = 'S';
      this.gradePoints = 10;
    } else if (this.totalMarks >= 80) {
      this.grade = 'A+';
      this.gradePoints = 9;
    } else if (this.totalMarks >= 70) {
      this.grade = 'A';
      this.gradePoints = 8;
    } else if (this.totalMarks >= 60) {
      this.grade = 'B+';
      this.gradePoints = 7;
    } else if (this.totalMarks >= 50) {
      this.grade = 'B';
      this.gradePoints = 6;
    } else if (this.totalMarks >= 40) {
      this.grade = 'P';
      this.gradePoints = 5;
    } else {
      this.grade = 'F';
      this.gradePoints = 0;
    }
  }
  
  // Legacy percentage calculation
  if (this.gradeValue && this.maxMarks) {
    this.percentage = (this.gradeValue / this.maxMarks) * 100;
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Grade', gradeSchema); 