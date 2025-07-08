const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: Date, required: true },
  periodIndex: { type: Number, required: true },
  attendance: [
    {
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      status: { type: String, enum: ['present', 'absent'], required: true }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema); 