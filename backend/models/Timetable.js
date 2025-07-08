const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    }, // specific class section
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    }, // department reference
    academicYear: { type: String, required: true }, // e.g., "2024-25"
    semester: { type: String, required: true }, // e.g., "1st Semester"
    schedule: [
      {
        day: {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ],
          required: true,
        },
        periods: [
          {
            // periodNumber: { type: Number, required: true }, // 1, 2, 3, etc.
            subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
            faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // faculty teaching this period
            startTime: { type: String, required: true }, // e.g., "09:00"
            endTime: { type: String, required: true }, // e.g., "10:00"
            room: { type: String }, // classroom number
            type: {
              type: String,
              enum: ["class", "break", "lunch"],
              default: "class",
            },
          },
        ],
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

module.exports = mongoose.model("Timetable", timetableSchema);
