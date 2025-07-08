const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "CSE", "ECE", "EEE"
  code: { type: String, required: true, unique: true }, // e.g., "CSE", "ECE"
  description: { type: String },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // department admins
  faculty: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // faculty members
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // students
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }], // sections like A, B, C
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema); 