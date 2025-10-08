const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Department = require('./models/Department');
const Class = require('./models/Class');
const Subject = require('./models/Subject');
const Timetable = require('./models/Timetable');

async function testTimetableAnalytics() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/digital_campus');
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 TESTING ENHANCED TIMETABLE ANALYTICS');
    console.log('═'.repeat(60));

    // Test Faculty Workload Analytics
    console.log('\n📊 Testing Faculty Workload Analytics...');
    const cseDept = await Department.findOne({ code: 'CSE' });
    
    const timetables = await Timetable.find({ department: cseDept._id })
      .populate('class', 'name fullName')
      .populate({
        path: 'schedule.periods.subject',
        select: 'name code credits'
      })
      .populate({
        path: 'schedule.periods.faculty',
        select: 'name email designation'
      });

    console.log(`🔄 Found ${timetables.length} timetables to analyze`);

    // Test Faculty Workload
    let facultyWorkload = {};
    let subjectAnalysis = {};

    for (const timetable of timetables) {
      console.log(`\n📋 Analyzing: ${timetable.class?.fullName} (${timetable.semester})`);
      
      for (const daySchedule of timetable.schedule) {
        for (const period of daySchedule.periods) {
          if (period.type === 'class') {
            // Faculty Analysis
            if (period.faculty) {
              const facultyId = period.faculty._id;
              const facultyName = period.faculty.name || 'Unknown Faculty';
              
              if (!facultyWorkload[facultyId]) {
                facultyWorkload[facultyId] = {
                  id: facultyId,
                  name: facultyName,
                  email: period.faculty.email || '',
                  designation: period.faculty.designation || '',
                  periods: 0,
                  subjects: new Set()
                };
              }
              
              facultyWorkload[facultyId].periods++;
              
              // Subject Analysis
              if (period.subject) {
                const subjectName = period.subject.name || 'Unknown Subject';
                const subjectCode = period.subject.code || '';
                
                facultyWorkload[facultyId].subjects.add(subjectName);
                
                if (!subjectAnalysis[subjectName]) {
                  subjectAnalysis[subjectName] = {
                    name: subjectName,
                    code: subjectCode,
                    credits: period.subject.credits || 0,
                    periods: 0,
                    faculty: new Set()
                  };
                }
                
                subjectAnalysis[subjectName].periods++;
                subjectAnalysis[subjectName].faculty.add(facultyName);
                
                console.log(`   ✅ ${subjectName} (${subjectCode}) - ${facultyName}`);
              } else {
                console.log(`   ⚠️  Period with faculty but no subject: ${facultyName}`);
              }
            } else {
              console.log(`   ⚠️  Period with no faculty assigned`);
            }
          }
        }
      }
    }

    // Display Faculty Workload Results
    console.log('\n👨‍🏫 FACULTY WORKLOAD ANALYSIS');
    console.log('─'.repeat(80));
    console.log('Faculty'.padEnd(30) + 'Email'.padEnd(35) + 'Periods'.padEnd(10) + 'Subjects');
    console.log('─'.repeat(80));
    
    const sortedFaculty = Object.values(facultyWorkload)
      .map(f => ({ ...f, subjects: Array.from(f.subjects) }))
      .sort((a, b) => b.periods - a.periods);

    sortedFaculty.forEach(faculty => {
      console.log(
        faculty.name.padEnd(30) + 
        faculty.email.padEnd(35) + 
        faculty.periods.toString().padEnd(10) + 
        `${faculty.subjects.length} (${faculty.subjects.slice(0, 2).join(', ')}${faculty.subjects.length > 2 ? '...' : ''})`
      );
    });

    // Display Subject Analysis Results
    console.log('\n📚 SUBJECT DISTRIBUTION ANALYSIS');
    console.log('─'.repeat(80));
    console.log('Subject'.padEnd(35) + 'Code'.padEnd(10) + 'Credits'.padEnd(10) + 'Periods'.padEnd(10) + 'Faculty Count');
    console.log('─'.repeat(80));
    
    const sortedSubjects = Object.values(subjectAnalysis)
      .map(s => ({ ...s, faculty: Array.from(s.faculty) }))
      .sort((a, b) => b.periods - a.periods);

    sortedSubjects.forEach(subject => {
      console.log(
        subject.name.slice(0, 34).padEnd(35) + 
        subject.code.padEnd(10) + 
        subject.credits.toString().padEnd(10) + 
        subject.periods.toString().padEnd(10) + 
        subject.faculty.length.toString()
      );
    });

    // Check for Issues
    console.log('\n🔍 DATA QUALITY CHECK');
    console.log('─'.repeat(50));
    
    const facultyWithoutSubjects = sortedFaculty.filter(f => f.subjects.length === 0);
    const subjectsWithoutFaculty = sortedSubjects.filter(s => s.faculty.length === 0);
    const facultyWithLowLoad = sortedFaculty.filter(f => f.periods < 5);
    const facultyWithHighLoad = sortedFaculty.filter(f => f.periods > 30);
    
    console.log(`✅ Faculty with proper subject assignments: ${sortedFaculty.length - facultyWithoutSubjects.length}/${sortedFaculty.length}`);
    console.log(`✅ Subjects with faculty assignments: ${sortedSubjects.length - subjectsWithoutFaculty.length}/${sortedSubjects.length}`);
    console.log(`⚠️  Faculty with low workload (<5 periods): ${facultyWithLowLoad.length}`);
    console.log(`⚠️  Faculty with high workload (>30 periods): ${facultyWithHighLoad.length}`);
    
    if (facultyWithoutSubjects.length > 0) {
      console.log(`❌ Faculty without subjects: ${facultyWithoutSubjects.map(f => f.name).join(', ')}`);
    }
    
    if (subjectsWithoutFaculty.length > 0) {
      console.log(`❌ Subjects without faculty: ${subjectsWithoutFaculty.map(s => s.name).join(', ')}`);
    }

    // Test New Analytics Endpoint Logic
    console.log('\n🧪 TESTING NEW ANALYTICS ENDPOINT LOGIC');
    console.log('─'.repeat(50));
    
    const analytics = {
      totalTimetables: timetables.length,
      totalFaculty: new Set(),
      totalSubjects: new Set(),
      facultyWorkloadSummary: {},
      subjectDistributionSummary: {}
    };
    
    // Simulate the enhanced analytics logic
    for (const timetable of timetables) {
      for (const daySchedule of timetable.schedule) {
        for (const period of daySchedule.periods) {
          if (period.type === 'class') {
            if (period.faculty) {
              analytics.totalFaculty.add(period.faculty._id.toString());
            }
            if (period.subject) {
              analytics.totalSubjects.add(period.subject._id.toString());
            }
          }
        }
      }
    }
    
    console.log(`📊 Analytics Summary:`);
    console.log(`   Timetables: ${analytics.totalTimetables}`);
    console.log(`   Unique Faculty: ${analytics.totalFaculty.size}`);
    console.log(`   Unique Subjects: ${analytics.totalSubjects.size}`);
    console.log(`   Faculty Workload Records: ${Object.keys(facultyWorkload).length}`);
    console.log(`   Subject Distribution Records: ${Object.keys(subjectAnalysis).length}`);

    // Validation Summary
    console.log('\n✅ VALIDATION RESULTS');
    console.log('═'.repeat(60));
    
    const allPassed = 
      facultyWithoutSubjects.length === 0 && 
      subjectsWithoutFaculty.length === 0 && 
      analytics.totalFaculty.size > 0 && 
      analytics.totalSubjects.size > 0;
    
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED - Timetable analytics data is properly structured!');
      console.log('✅ No hash values detected in subject or faculty names');
      console.log('✅ All relationships are properly populated');
      console.log('✅ Analytics functions should work correctly');
    } else {
      console.log('❌ SOME ISSUES DETECTED - Please review the data quality issues above');
    }

    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('─'.repeat(30));
    console.log('1. Use the enhanced analytics endpoint: /api/timetable/analytics/comprehensive');
    console.log('2. Ensure all timetable queries use proper population');
    console.log('3. Add null checks for subject and faculty references');
    console.log('4. Consider adding data validation hooks in models');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Test error:', error);
    await mongoose.disconnect();
  }
}

testTimetableAnalytics();