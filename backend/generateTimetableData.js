const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Department = require('./models/Department');
const Class = require('./models/Class');
const Subject = require('./models/Subject');
const Timetable = require('./models/Timetable');

async function generateTimetableData() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/digital_campus');
    console.log('✅ Connected to MongoDB');

    // Work with existing data
    console.log('\n🏗️ Working with existing data and generating missing components...\n');

    // 1. Get existing CSE Department
    console.log('1️⃣ Getting existing CSE Department...');
    const cseDept = await Department.findOne({ code: 'CSE' });
    if (!cseDept) {
      throw new Error('CSE Department not found. Please create it first.');
    }
    console.log(`✅ Found department: ${cseDept.name} (${cseDept.code})`);

    // 2. Get existing users
    console.log('\n2️⃣ Getting existing users...');
    const cseAdmin = await User.findOne({ email: 'jake@gmail.com', role: 'departmentAdmin' });
    const faculty = await User.find({ role: 'faculty', department: cseDept._id });
    const students = await User.find({ role: 'student', department: cseDept._id });
    
    console.log(`✅ Found CSE Admin: ${cseAdmin.name} (${cseAdmin.email})`);
    console.log(`✅ Found ${faculty.length} faculty members:`);
    faculty.forEach(f => console.log(`  - ${f.name} (${f.email})`));
    console.log(`✅ Found ${students.length} students:`);
    students.forEach(s => console.log(`  - ${s.name} (${s.email})`));
    
    // Update existing students with roll numbers if not present
    if (students[0] && !students[0].rollNumber) {
      await User.findByIdAndUpdate(students[0]._id, { rollNumber: 'CSE2024001' });
    }
    if (students[1] && !students[1].rollNumber) {
      await User.findByIdAndUpdate(students[1]._id, { rollNumber: 'CSE2024002' });
    }

    // 3. Create Subjects for Different Semesters
    console.log('\n3️⃣ Creating Subjects...');
    const subjectsData = [
      // 1st Semester
      { name: 'Programming Fundamentals', code: 'CSE101', credits: 4, semester: '1st Semester' },
      { name: 'Mathematics-I', code: 'MATH101', credits: 4, semester: '1st Semester' },
      { name: 'Physics', code: 'PHY101', credits: 3, semester: '1st Semester' },
      { name: 'English Communication', code: 'ENG101', credits: 2, semester: '1st Semester' },
      { name: 'Engineering Drawing', code: 'ED101', credits: 2, semester: '1st Semester' },
      { name: 'Environmental Science', code: 'EVS101', credits: 2, semester: '1st Semester' },
      
      // 2nd Semester  
      { name: 'Data Structures', code: 'CSE102', credits: 4, semester: '2nd Semester' },
      { name: 'Mathematics-II', code: 'MATH102', credits: 4, semester: '2nd Semester' },
      { name: 'Chemistry', code: 'CHEM102', credits: 3, semester: '2nd Semester' },
      { name: 'Technical Writing', code: 'ENG102', credits: 2, semester: '2nd Semester' },
      { name: 'Computer Graphics', code: 'CSE103', credits: 3, semester: '2nd Semester' },
      
      // 3rd Semester
      { name: 'Object Oriented Programming', code: 'CSE201', credits: 4, semester: '3rd Semester' },
      { name: 'Database Management Systems', code: 'CSE202', credits: 4, semester: '3rd Semester' },
      { name: 'Computer Networks', code: 'CSE203', credits: 3, semester: '3rd Semester' },
      { name: 'Operating Systems', code: 'CSE204', credits: 4, semester: '3rd Semester' },
      { name: 'Discrete Mathematics', code: 'MATH201', credits: 3, semester: '3rd Semester' },
      
      // 4th Semester
      { name: 'Web Technologies', code: 'CSE301', credits: 4, semester: '4th Semester' },
      { name: 'Software Engineering', code: 'CSE302', credits: 3, semester: '4th Semester' },
      { name: 'Algorithm Analysis', code: 'CSE303', credits: 4, semester: '4th Semester' },
      { name: 'Computer Architecture', code: 'CSE304', credits: 3, semester: '4th Semester' },
      { name: 'Theory of Computation', code: 'CSE305', credits: 3, semester: '4th Semester' }
    ];

    const subjects = [];
    for (const subjectInfo of subjectsData) {
      const subject = await Subject.create({
        ...subjectInfo,
        department: cseDept._id,
        description: `${subjectInfo.name} course for CSE students`
      });
      subjects.push(subject);
      console.log(`✅ Created subject: ${subject.name} (${subject.code}) - ${subject.semester}`);
    }

    // 4. Create Class (CSE-A)
    console.log('\n4️⃣ Creating Class CSE-A...');
    const cseClassA = await Class.create({
      name: 'A',
      fullName: 'CSE-A',
      department: cseDept._id,
      classTeacher: faculty[0]._id, // Dr. Alice Johnson
      academicYear: '2024-25',
      semester: '1st Semester',
      capacity: 60,
      currentStrength: students.length,
      students: students.map(s => s._id),
      status: 'active'
    });

    // Assign first semester subjects to class with faculty mapping
    const firstSemesterSubjects = subjects.filter(s => s.semester === '1st Semester');
    const subjectFacultyMapping = [
      { subject: firstSemesterSubjects.find(s => s.code === 'CSE101'), faculty: faculty[0] }, // Alice - Programming Fundamentals
      { subject: firstSemesterSubjects.find(s => s.code === 'MATH101'), faculty: faculty[1] }, // Hank - Mathematics-I
      { subject: firstSemesterSubjects.find(s => s.code === 'PHY101'), faculty: faculty[2] }, // Stone - Physics
      { subject: firstSemesterSubjects.find(s => s.code === 'ENG101'), faculty: faculty[0] }, // Alice - English Communication
      { subject: firstSemesterSubjects.find(s => s.code === 'ED101'), faculty: faculty[1] }, // Hank - Engineering Drawing
      { subject: firstSemesterSubjects.find(s => s.code === 'EVS101'), faculty: faculty[2] } // Stone - Environmental Science
    ];

    cseClassA.subjects = subjectFacultyMapping.map(mapping => ({
      subject: mapping.subject._id,
      faculty: mapping.faculty._id
    }));

    await cseClassA.save();
    console.log(`✅ Created class: ${cseClassA.fullName} with ${cseClassA.currentStrength} students`);

    // Update students with class reference
    await User.updateMany(
      { _id: { $in: students.map(s => s._id) } },
      { class: cseClassA._id }
    );

    // Update department with class and students
    await Department.findByIdAndUpdate(cseDept._id, {
      $push: { 
        classes: cseClassA._id,
        students: { $each: students.map(s => s._id) }
      }
    });

    // Update faculty with subjects
    for (const mapping of subjectFacultyMapping) {
      await User.findByIdAndUpdate(mapping.faculty._id, {
        $push: { subjects: { _id: mapping.subject._id, name: mapping.subject.name } }
      });
      
      await Subject.findByIdAndUpdate(mapping.subject._id, {
        $push: { 
          faculty: mapping.faculty._id,
          classes: cseClassA._id 
        }
      });
    }

    // 5. Create Comprehensive Timetable
    console.log('\n5️⃣ Creating Comprehensive Timetable...');
    
    const timeSlots = [
      { start: '09:00', end: '09:50' },
      { start: '09:50', end: '10:40' },
      { start: '10:40', end: '10:50', type: 'break' }, // Short Break
      { start: '10:50', end: '11:40' },
      { start: '11:40', end: '12:30' },
      { start: '12:30', end: '01:30', type: 'lunch' }, // Lunch Break
      { start: '01:30', end: '02:20' },
      { start: '02:20', end: '03:10' },
      { start: '03:10', end: '03:20', type: 'break' }, // Short Break
      { start: '03:20', end: '04:10' },
      { start: '04:10', end: '05:00' }
    ];

    const rooms = ['CSE-101', 'CSE-102', 'CSE-103', 'LAB-1', 'LAB-2', 'PHYSICS-LAB'];
    
    // Weekly schedule template
    const weeklySchedule = {
      monday: [
        { subject: 'CSE101', faculty: faculty[0], room: 'CSE-101' }, // Programming Fundamentals
        { subject: 'CSE101', faculty: faculty[0], room: 'LAB-1' }, // Programming Lab
        { subject: 'MATH101', faculty: faculty[1], room: 'CSE-102' }, // Mathematics-I
        { subject: 'PHY101', faculty: faculty[2], room: 'CSE-103' }, // Physics
        { subject: 'ENG101', faculty: faculty[0], room: 'CSE-101' }, // English
        { subject: 'ED101', faculty: faculty[1], room: 'CSE-102' } // Engineering Drawing
      ],
      tuesday: [
        { subject: 'MATH101', faculty: faculty[1], room: 'CSE-102' }, // Mathematics-I
        { subject: 'PHY101', faculty: faculty[2], room: 'PHYSICS-LAB' }, // Physics Lab
        { subject: 'PHY101', faculty: faculty[2], room: 'PHYSICS-LAB' }, // Physics Lab
        { subject: 'CSE101', faculty: faculty[0], room: 'CSE-101' }, // Programming Fundamentals
        { subject: 'EVS101', faculty: faculty[2], room: 'CSE-103' }, // Environmental Science
        { subject: 'ENG101', faculty: faculty[0], room: 'CSE-101' } // English
      ],
      wednesday: [
        { subject: 'CSE101', faculty: faculty[0], room: 'LAB-1' }, // Programming Lab
        { subject: 'CSE101', faculty: faculty[0], room: 'LAB-1' }, // Programming Lab
        { subject: 'MATH101', faculty: faculty[1], room: 'CSE-102' }, // Mathematics-I
        { subject: 'PHY101', faculty: faculty[2], room: 'CSE-103' }, // Physics
        { subject: 'ED101', faculty: faculty[1], room: 'CSE-102' }, // Engineering Drawing
        { subject: 'EVS101', faculty: faculty[2], room: 'CSE-103' } // Environmental Science
      ],
      thursday: [
        { subject: 'MATH101', faculty: faculty[1], room: 'CSE-102' }, // Mathematics-I
        { subject: 'CSE101', faculty: faculty[0], room: 'CSE-101' }, // Programming Fundamentals
        { subject: 'ENG101', faculty: faculty[0], room: 'CSE-101' }, // English
        { subject: 'PHY101', faculty: faculty[2], room: 'CSE-103' }, // Physics
        { subject: 'ED101', faculty: faculty[1], room: 'LAB-2' }, // Engineering Drawing Lab
        { subject: 'ED101', faculty: faculty[1], room: 'LAB-2' } // Engineering Drawing Lab
      ],
      friday: [
        { subject: 'EVS101', faculty: faculty[2], room: 'CSE-103' }, // Environmental Science
        { subject: 'MATH101', faculty: faculty[1], room: 'CSE-102' }, // Mathematics-I
        { subject: 'CSE101', faculty: faculty[0], room: 'CSE-101' }, // Programming Fundamentals
        { subject: 'PHY101', faculty: faculty[2], room: 'CSE-103' }, // Physics
        { subject: 'ENG101', faculty: faculty[0], room: 'CSE-101' }, // English
        { subject: 'EVS101', faculty: faculty[2], room: 'CSE-103' } // Environmental Science
      ],
      saturday: [
        { subject: 'CSE101', faculty: faculty[0], room: 'LAB-1' }, // Programming Lab
        { subject: 'CSE101', faculty: faculty[0], room: 'LAB-1' }, // Programming Lab
        { subject: 'MATH101', faculty: faculty[1], room: 'CSE-102' }, // Mathematics-I
        { subject: 'ED101', faculty: faculty[1], room: 'CSE-102' }, // Engineering Drawing
        null, // Free period
        null  // Free period
      ]
    };

    // Create timetable schedule
    const schedule = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (const day of days) {
      const daySchedule = { day, periods: [] };
      const dayClasses = weeklySchedule[day];
      
      for (let i = 0; i < timeSlots.length; i++) {
        const timeSlot = timeSlots[i];
        
        if (timeSlot.type === 'break') {
          daySchedule.periods.push({
            startTime: timeSlot.start,
            endTime: timeSlot.end,
            type: 'break',
            room: null
          });
        } else if (timeSlot.type === 'lunch') {
          daySchedule.periods.push({
            startTime: timeSlot.start,
            endTime: timeSlot.end,
            type: 'lunch',
            room: null
          });
        } else {
          // Regular class periods
          const classIndex = daySchedule.periods.filter(p => p.type === 'class').length;
          const classInfo = dayClasses[classIndex];
          
          if (classInfo) {
            const subject = subjects.find(s => s.code === classInfo.subject);
            daySchedule.periods.push({
              subject: subject._id,
              faculty: classInfo.faculty._id,
              startTime: timeSlot.start,
              endTime: timeSlot.end,
              room: classInfo.room,
              type: 'class'
            });
          } else {
            // Free period
            daySchedule.periods.push({
              startTime: timeSlot.start,
              endTime: timeSlot.end,
              type: 'class',
              room: null
            });
          }
        }
      }
      schedule.push(daySchedule);
    }

    // Create timetable
    const timetable = await Timetable.create({
      class: cseClassA._id,
      department: cseDept._id,
      academicYear: '2024-25',
      semester: '1st Semester',
      schedule: schedule,
      status: 'active'
    });

    // Update class with timetable reference
    await Class.findByIdAndUpdate(cseClassA._id, {
      timetable: timetable._id
    });

    console.log(`✅ Created comprehensive timetable for ${cseClassA.fullName}`);
    console.log(`   📅 Days: ${days.length} (Monday to Saturday)`);
    console.log(`   ⏰ Time slots: ${timeSlots.length} (including breaks and lunch)`);
    console.log(`   📚 Subjects scheduled: ${firstSemesterSubjects.length}`);

    // 6. Generate Summary
    console.log('\n📊 DATA GENERATION SUMMARY');
    console.log('═══════════════════════════════════════');
    
    const finalCounts = {
      departments: await Department.countDocuments(),
      users: await User.countDocuments(),
      classes: await Class.countDocuments(),
      subjects: await Subject.countDocuments(),
      timetables: await Timetable.countDocuments()
    };
    
    console.log(`🏢 Departments: ${finalCounts.departments}`);
    console.log(`👥 Total Users: ${finalCounts.users}`);
    console.log(`   - Super Admin: 1`);
    console.log(`   - Department Admin: 1 (CSE)`);
    console.log(`   - Faculty: ${faculty.length}`);
    console.log(`   - Students: ${students.length}`);
    console.log(`🏫 Classes: ${finalCounts.classes}`);
    console.log(`📚 Subjects: ${finalCounts.subjects}`);
    console.log(`📅 Timetables: ${finalCounts.timetables}`);

    console.log('\n🔐 LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════');
    console.log('Super Admin:');
    console.log('  admin@gmail.com === admin');
    console.log('\nCSE Admin:');
    console.log('  jake@gmail.com === cseadmin');
    console.log('\nCSE Faculty:');
    console.log('  alice@gmail.com === Faculty@123');
    console.log('  hank@gmail.com === Faculty@123');
    console.log('  stone@gmail.com === Faculty@123');
    console.log('\nCSE Students (Class-A):');
    console.log('  raju@gmail.com === Student@123');
    console.log('  ram@gmail.com === Student@123');

    console.log('\n🎯 TIMETABLE FEATURES GENERATED');
    console.log('═══════════════════════════════════════');
    console.log('✅ 6-day weekly schedule (Mon-Sat)');
    console.log('✅ 10 time slots with breaks and lunch');
    console.log('✅ Subject-faculty assignments');
    console.log('✅ Room allocations');
    console.log('✅ Lab sessions for practical subjects');
    console.log('✅ Balanced subject distribution');
    console.log('✅ Break and lunch periods');
    console.log('✅ Multiple semesters of subjects');
    console.log('✅ Comprehensive academic structure');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('\n🎉 Timetable data generation completed successfully!');
    console.log('You can now test timetable functionality with realistic data.');

  } catch (error) {
    console.error('❌ Error generating timetable data:', error);
    await mongoose.disconnect();
  }
}

// Run the data generator
generateTimetableData();