const mongoose = require('mongoose');
require('dotenv').config();

async function checkData() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/digital_campus');
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    const Department = require('./models/Department');
    const Class = require('./models/Class');
    const Subject = require('./models/Subject');
    const Timetable = require('./models/Timetable');
    
    console.log('\n=== CURRENT DATA STATE ===');
    
    const users = await User.find({}).select('name email role department');
    console.log(`\nUsers (${users.length}):`);
    users.forEach(u => console.log(`- ${u.name} (${u.email}) - ${u.role}`));
    
    const departments = await Department.find({}).select('name code');
    console.log(`\nDepartments (${departments.length}):`);
    departments.forEach(d => console.log(`- ${d.name} (${d.code})`));
    
    const classes = await Class.find({}).select('fullName department semester').populate('department', 'name');
    console.log(`\nClasses (${classes.length}):`);
    classes.forEach(c => console.log(`- ${c.fullName} (${c.department?.name || 'Unknown'}) - ${c.semester}`));
    
    const subjects = await Subject.find({}).select('name code semester').populate('department', 'name');
    console.log(`\nSubjects (${subjects.length}):`);
    subjects.forEach(s => console.log(`- ${s.name} (${s.code}) - ${s.department?.name || 'Unknown'} - ${s.semester}`));
    
    const timetables = await Timetable.find({}).select('class department semester').populate('class', 'fullName').populate('department', 'name');
    console.log(`\nTimetables (${timetables.length}):`);
    timetables.forEach(t => console.log(`- ${t.class?.fullName || 'Unknown'} (${t.department?.name || 'Unknown'}) - ${t.semester}`));
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

checkData();