const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "departmentAdmin", "faculty", "student"],
      required: true,
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" }, // for faculty, departmentAdmin, student
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" }, // for students - the specific section they belong to
    
    // Additional fields for faculty
    phone: { type: String },
    qualification: { type: String }, // for faculty
    experience: { type: Number, default: 0 }, // for faculty
    designation: { type: String }, // for faculty
    isClassTeacher: { type: Boolean, default: false }, // indicates if faculty is a class teacher
    
    // Subjects taught by faculty
    subjects: [{ _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }, name: String }],
    
    // Additional fields for students
    rollNumber: { type: String }, // for students
    semester: { type: String }, // for students (1st Semester, 2nd Semester, etc.)
    address: { type: String }, // for students
    parentName: { type: String }, // for students
    parentPhone: { type: String }, // for students

    // Academic performance for students
    grades: [
      {
        semester: { type: String }, // e.g., '1st Semester', ...
        isSemesterCompleted: { type: Boolean, default: false },
        sgpa: { type: Number, default: 0 },
        released: { type: Boolean, default: false } // whether results are released for this semester
      }
    ],
    cgpa: { type: Number, default: 0 },
    
    // Status field for both faculty and students
    status: { 
      type: String, 
      enum: ['active', 'inactive'], 
      default: 'active' 
    }
  },
  { timestamps: true }
);

userSchema.statics.seedAdmin = async function () {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.warn("Admin email or password not set in .env");
    return;
  }
  const existingAdmin = await this.findOne({
    email: adminEmail,
    role: "admin",
  });
  if (!existingAdmin) {
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await this.create({
      name: "Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    });
  } else {
  }
};

module.exports = mongoose.model("User", userSchema);
