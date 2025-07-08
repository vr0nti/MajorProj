const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "A", "B", "C"
    fullName: { type: String, required: true }, // e.g., "CSE-A", "ECE-B"
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // faculty assigned as class teacher
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // students in this section
    timetable: { type: mongoose.Schema.Types.ObjectId, ref: "Timetable" },
    academicYear: { type: String }, // e.g., "2024-25"
    semester: { type: String, required: true }, // e.g., "1st Semester", "2nd Semester"
    capacity: { type: Number, default: 60 }, // maximum students allowed
    currentStrength: { type: Number, default: 0 }, // current number of students
    subjects: [
      {
        subject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
          required: true,
        },
        faculty: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: false,
          default: null,
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);
