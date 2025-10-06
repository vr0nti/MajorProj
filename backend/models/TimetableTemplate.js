const mongoose = require("mongoose");

const timetableTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Template schedule structure (without class/academic year specifics)
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
            subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
            faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            startTime: { type: String, required: true },
            endTime: { type: String, required: true },
            room: { type: String },
            type: {
              type: String,
              enum: ["class", "break", "lunch"],
              default: "class",
            },
          },
        ],
      },
    ],
    // Statistics
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsed: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TimetableTemplate", timetableTemplateSchema);
