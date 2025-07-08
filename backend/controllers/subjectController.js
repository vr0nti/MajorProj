const Subject = require('../models/Subject');
const User = require('../models/User');

exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().populate('faculty').populate('department');
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 