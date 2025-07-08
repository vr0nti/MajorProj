const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  credits: { type: Number, default: 3 },
  semester: { type: String, default: '1st Semester' }, // e.g., "1st Semester", "2nd Semester"
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  faculty: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema); 