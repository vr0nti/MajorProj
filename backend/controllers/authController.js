const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      class: classId,
      section,
    } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      department,
      class: classId,
      section,
    });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email })
      .populate('department', 'name code')
      .populate('class', 'name fullName');
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });
    const tokenPayload = {
      userId: user._id,
      role: user.role,
      department: user.department?._id || user.department,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department?._id || user.department,
        departmentName: user.department?.name,
        departmentCode: user.department?.code,
        class: user.class?._id || user.class,
        className: user.class?.fullName || user.class?.name,
        status: user.status,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-password")
      .populate('department', 'name code')
      .populate('class', 'name fullName');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department?._id || user.department,
      departmentName: user.department?.name,
      departmentCode: user.department?.code,
      class: user.class?._id || user.class,
      className: user.class?.fullName || user.class?.name,
      status: user.status,
      phone: user.phone,
      specialization: user.specialization,
      qualification: user.qualification,
      experience: user.experience,
      designation: user.designation,
      isClassTeacher: user.isClassTeacher,
      rollNumber: user.rollNumber,
      semester: user.semester,
      address: user.address,
      parentName: user.parentName,
      parentPhone: user.parentPhone,
      grades: user.grades,
      cgpa: user.cgpa
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { id, currentPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findOne({
      _id: id,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();


    res.json({
      message: 'Password reset successfully',
      newPassword
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};
