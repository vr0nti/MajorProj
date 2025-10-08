const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Dashboard statistics
const getDashboard = async (req, res) => {
  try {
    const departmentId = req.user.department;
    
    // Get counts
    const totalClasses = await Class.countDocuments({ department: departmentId });
    const totalFaculty = await User.countDocuments({ 
      role: 'faculty', 
      department: departmentId 
    });
    const totalSubjects = await Subject.countDocuments({ department: departmentId });
    const totalStudents = await User.countDocuments({ 
      role: 'student', 
      department: departmentId 
    });

    // Get recent classes
    const recentClasses = await Class.find({ department: departmentId })
      .populate('classTeacher', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name fullName classTeacher createdAt semester');

    // Get recent faculty
    const recentFaculty = await User.find({ 
      role: 'faculty', 
      department: departmentId 
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');

    res.json({
      totalClasses,
      totalFaculty,
      totalSubjects,
      totalStudents,
      recentClasses: recentClasses.map(cls => ({
        name: cls.fullName || cls.name,
        faculty: cls.classTeacher?.name || 'Unassigned',
        subject: cls.semester || 'N/A'
      })),
      recentFaculty: recentFaculty.map(faculty => ({
        name: faculty.name,
        email: faculty.email,
        subject: faculty.specialization || 'General'
      }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};

// Classes CRUD
const getClasses = async (req, res) => {
  try {
    const departmentId = req.user.department;
    const classes = await Class.find({ department: departmentId })
      .populate('classTeacher', 'name email specialization designation')
      .populate('timetable')
      .populate({
        path: 'subjects.subject',
        select: 'name code credits type'
      })
      .populate({
        path: 'subjects.faculty',
        select: 'name email specialization'
      })
      .populate('students', 'name rollNumber')
      .populate('department', 'name code')
      .sort({ semester: 1, name: 1 });

    const formattedClasses = classes.map(cls => {
      // Calculate statistics
      const studentCount = cls.students ? cls.students.length : 0;
      const capacityUtilization = cls.capacity > 0 ? ((studentCount / cls.capacity) * 100).toFixed(1) : 0;
      const subjectsAssigned = cls.subjects ? cls.subjects.filter(s => s.faculty).length : 0;
      const totalSubjects = cls.subjects ? cls.subjects.length : 0;
      const subjectAssignmentRate = totalSubjects > 0 ? ((subjectsAssigned / totalSubjects) * 100).toFixed(1) : 0;
      
      // Get subjects summary
      const subjectsSummary = cls.subjects ? cls.subjects.map(s => ({
        name: s.subject?.name || 'Unknown',
        code: s.subject?.code || 'N/A',
        credits: s.subject?.credits || 0,
        type: s.subject?.type || 'theory',
        faculty: s.faculty?.name || 'Unassigned',
        facultySpecialization: s.faculty?.specialization || 'N/A'
      })) : [];
      
      return {
        _id: cls._id,
        name: cls.name,
        fullName: cls.fullName,
        semester: cls.semester,
        academicYear: cls.academicYear,
        department: {
          name: cls.department?.name || 'Unknown',
          code: cls.department?.code || 'N/A'
        },
        classTeacher: {
          name: cls.classTeacher?.name || 'Unassigned',
          email: cls.classTeacher?.email || '',
          specialization: cls.classTeacher?.specialization || 'N/A',
          designation: cls.classTeacher?.designation || 'Faculty'
        },
        capacity: cls.capacity,
        currentStrength: studentCount,
        capacityUtilization: parseFloat(capacityUtilization),
        subjects: {
          total: totalSubjects,
          assigned: subjectsAssigned,
          assignmentRate: parseFloat(subjectAssignmentRate),
          details: subjectsSummary,
          totalCredits: subjectsSummary.reduce((sum, s) => sum + (s.credits || 0), 0)
        },
        timetable: {
          exists: cls.timetable ? true : false,
          status: cls.timetable?.status || 'Not Created'
        },
        status: cls.status,
        createdAt: cls.createdAt,
        updatedAt: cls.updatedAt,
        // Legacy fields for backward compatibility
        subject: cls.subjects && cls.subjects.length > 0 ? cls.subjects[0].subject?.name : 'Multiple Subjects',
        faculty: cls.classTeacher?.name || 'Unassigned',
        schedule: cls.timetable?.schedule || 'Not scheduled',
        room: cls.timetable?.room || 'TBD',
        description: `${cls.fullName} - ${cls.semester} (${studentCount}/${cls.capacity} students)`
      };
    });

    res.json(formattedClasses);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ message: 'Error fetching classes' });
  }
};

const createClass = async (req, res) => {
  try {
    // "subjects" will arrive as an array like [{ subject: <subjectId>, faculty: <facultyId> }]
    // We accept it and store only valid pairs (faculty may be optional)
    const { name, classTeacherId, academicYear, semester, capacity, subjects } = req.body;
    const departmentId = req.user.department;

    // Check if class with same name already exists in this department
    const existingClass = await Class.findOne({ 
      name, 
      department: departmentId,
      academicYear,
      semester
    });
    if (existingClass) {
      return res.status(400).json({ 
        message: 'Class with this name already exists in this department for the given academic year and semester' 
      });
    }

    // Get department info for fullName
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Create full name (e.g., "CSE-A")
    const fullName = `${department.code}-${name}`;
    
    // Filter out placeholders or empty selections the frontend might send
    const cleanedSubjects = Array.isArray(subjects)
      ? subjects.filter(s => s && s.subject && s.faculty && s.faculty !== '-' && s.faculty !== '')
      : [];

    const newClass = new Class({
      name,
      fullName,
      department: departmentId,
      academicYear,
      semester,
      capacity: capacity || 60,
      status: 'active',
      subjects: cleanedSubjects
    });

    // Add class teacher if provided
    if (classTeacherId && classTeacherId !== "-") {
      const facultyUser = await User.findOne({ 
        _id: classTeacherId, 
        role: 'faculty', 
        department: departmentId 
      });
      
      if (facultyUser) {
        newClass.classTeacher = facultyUser._id;
        // Update faculty user to mark as class teacher
        await User.findByIdAndUpdate(facultyUser._id, { isClassTeacher: true });
      }
    }

    await newClass.save();

    // Add this class reference inside each related Subject document (handy for look-ups)
    if (cleanedSubjects.length) {
      await Subject.updateMany(
        { _id: { $in: cleanedSubjects.map(s => s.subject) } },
        { $addToSet: { classes: newClass._id } }
      );
    }

    // Update Department model - add class to department
    await Department.findByIdAndUpdate(departmentId, {
      $push: { classes: newClass._id }
    });

    res.status(201).json({ message: 'Class created successfully', class: newClass });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ message: 'Error creating class' });
  }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, classTeacherId, academicYear, semester, capacity, status, subjects } = req.body;
    const departmentId = req.user.department;

    const classToUpdate = await Class.findOne({ _id: id, department: departmentId });
    if (!classToUpdate) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if class with same name already exists (excluding current class)
    const existingClass = await Class.findOne({ 
      name, 
      department: departmentId,
      academicYear,
      semester,
      _id: { $ne: id }
    });
    if (existingClass) {
      return res.status(400).json({ 
        message: 'Class with this name already exists in this department for the given academic year and semester' 
      });
    }

    // Get department info for fullName
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Create full name (e.g., "CSE-A")
    const fullName = `${department.code}-${name}`;

    // Handle class teacher changes
    const oldClassTeacherId = classToUpdate.classTeacher;
    let newClassTeacherId = null;

    if (classTeacherId && classTeacherId !== "-") {
      const facultyUser = await User.findOne({ 
        _id: classTeacherId, 
        role: 'faculty', 
        department: departmentId 
      });
      
      if (facultyUser) {
        newClassTeacherId = facultyUser._id;
      }
    }

    // Remove old class teacher status
    if (oldClassTeacherId && oldClassTeacherId.toString() !== newClassTeacherId?.toString()) {
      await User.findByIdAndUpdate(oldClassTeacherId, { isClassTeacher: false });
    }

    // Add new class teacher status
    if (newClassTeacherId && (!oldClassTeacherId || oldClassTeacherId.toString() !== newClassTeacherId.toString())) {
      await User.findByIdAndUpdate(newClassTeacherId, { isClassTeacher: true });
    }

    classToUpdate.name = name;
    classToUpdate.fullName = fullName;
    classToUpdate.classTeacher = newClassTeacherId;
    classToUpdate.academicYear = academicYear;
    classToUpdate.semester = semester;
    classToUpdate.capacity = capacity || classToUpdate.capacity;
    classToUpdate.status = status || classToUpdate.status;

    // Handle subject-faculty updates (replace with new clean array)
    if (Array.isArray(subjects)) {
      const cleanedSubjects = subjects.filter(s => s && s.subject && s.faculty && s.faculty !== '-' && s.faculty !== '');
      classToUpdate.subjects = cleanedSubjects;

      // Ensure Subject documents include this class reference
      await Subject.updateMany(
        { _id: { $in: cleanedSubjects.map(s => s.subject) } },
        { $addToSet: { classes: classToUpdate._id } }
      );
    }

    await classToUpdate.save();

    res.json({ message: 'Class updated successfully', class: classToUpdate });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ message: 'Error updating class' });
  }
};

const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = req.user.department;

    const classToDelete = await Class.findOne({ _id: id, department: departmentId });
    if (!classToDelete) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Remove class teacher status from faculty
    if (classToDelete.classTeacher) {
      await User.findByIdAndUpdate(classToDelete.classTeacher, { isClassTeacher: false });
    }

    // Remove students from this class
    if (classToDelete.students && classToDelete.students.length > 0) {
      await User.updateMany(
        { _id: { $in: classToDelete.students } },
        { $unset: { class: 1 } }
      );
    }

    // Remove from department
    await Department.findByIdAndUpdate(departmentId, {
      $pull: { classes: id }
    });

    await Class.findByIdAndDelete(id);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ message: 'Error deleting class' });
  }
};

// Faculty CRUD
const getFaculty = async (req, res) => {
  try {
    const departmentId = req.user.department;
    
    if (!departmentId) {
      console.error('No department ID found in user:', req.user);
      return res.status(400).json({ message: 'User is not associated with any department' });
    }

    // Get the department to verify it exists and get its name
    const department = await Department.findById(departmentId);
    if (!department) {
      console.error('Department not found with ID:', departmentId);
      return res.status(404).json({ message: 'Department not found' });
    }
    
    console.log('Fetching faculty for department:', department.name);
    
    const faculty = await User.find({ 
      role: 'faculty', 
      department: departmentId 
    })
    .populate({
      path: 'subjects',
      select: 'name',
      model: 'Subject'
    })
    .sort({ createdAt: -1 });

    console.log(`Found ${faculty.length} faculty members`);
    
    const formattedFaculty = faculty.map(f => {
      const subjectName = f.subjects && f.subjects.length > 0 
        ? f.subjects[0].name 
        : 'General';
      
      return {
        _id: f._id,
        name: f.name,
        email: f.email,
        phone: f.phone || 'Not provided',
        subject: subjectName,
        subjects: f.subjects || [],
        qualification: f.qualification || 'Not specified',
        experience: f.experience || 0,
        designation: f.designation || 'Faculty',
        department: department.name, // Use the department name we already have
        departmentId: department._id,
        status: f.status || 'active'
      };
    });

    res.json(formattedFaculty);
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(500).json({ 
      message: 'Error fetching faculty',
      error: error.message 
    });
  }
};

const createFaculty = async (req, res) => {
  try {
    const { name, email, phone, qualification, experience, designation, subjectIds, password } = req.body;
    const departmentId = req.user.department;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    console.log(password);
    // Generate temporary password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find subject(s) by ID in this department
    const subjectDocs = await Subject.find({ _id: { $in: subjectIds }, department: departmentId });
    const subjectsArr = subjectDocs.map(s => ({ _id: s._id, name: s.name }));

    const newFaculty = new User({
      name,
      email,
      password: hashedPassword,
      role: 'faculty',
      department: departmentId,
      phone,
      qualification,
      experience,
      designation,
      status: 'active',
      subjects: subjectsArr
    });

    await newFaculty.save();

    // Update Department model - add faculty to department
    await Department.findByIdAndUpdate(departmentId, {
      $push: { faculty: newFaculty._id }
    });

    // Update Subject model - add faculty to each subject's faculty array
    await Subject.updateMany(
      { _id: { $in: subjectIds } },
      { $addToSet: { faculty: newFaculty._id } }
    );

    // TODO: Send email with temporary password
    console.log(`Temporary password for ${email}: ${password}`);

    res.status(201).json({ 
      message: 'Faculty created successfully', 
      faculty: newFaculty,
 
    });
  } catch (error) {
    console.error('Create faculty error:', error);
    res.status(500).json({ message: 'Error creating faculty' });
  }
};

const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, qualification, experience, designation, subjectIds } = req.body;
    const departmentId = req.user.department;

    const facultyToUpdate = await User.findOne({ 
      _id: id, 
      role: 'faculty', 
      department: departmentId 
    });

    if (!facultyToUpdate) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Check if email is being changed and if it already exists
    if (email !== facultyToUpdate.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    }

    // Remove faculty from all subjects in this department
    await Subject.updateMany(
      { faculty: id, department: departmentId },
      { $pull: { faculty: id } }
    );

    // Add faculty to new subjects
    const subjectDocs = await Subject.find({ _id: { $in: subjectIds }, department: departmentId });
    const subjectsArr = subjectDocs.map(s => ({ _id: s._id, name: s.name }));
    await Subject.updateMany(
      { _id: { $in: subjectIds } },
      { $addToSet: { faculty: id } }
    );

    facultyToUpdate.name = name;
    facultyToUpdate.email = email;
    facultyToUpdate.phone = phone;
    facultyToUpdate.qualification = qualification;
    facultyToUpdate.experience = experience;
    facultyToUpdate.designation = designation;
    facultyToUpdate.subjects = subjectsArr;

    await facultyToUpdate.save();

    res.json({ message: 'Faculty updated successfully', faculty: facultyToUpdate });
  } catch (error) {
    console.error('Update faculty error:', error);
    res.status(500).json({ message: 'Error updating faculty' });
  }
};

const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = req.user.department;

    const facultyToDelete = await User.findOne({ 
      _id: id, 
      role: 'faculty', 
      department: departmentId 
    });

    if (!facultyToDelete) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Remove from department
    await Department.findByIdAndUpdate(departmentId, {
      $pull: { faculty: id }
    });

    // Remove from subjects
    await Subject.updateMany(
      { faculty: id },
      { $pull: { faculty: id } }
    );

    // Remove from classes where they are class teacher
    await Class.updateMany(
      { classTeacher: id },
      { $unset: { classTeacher: 1 } }
    );

    await User.findByIdAndDelete(id);
    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    console.error('Delete faculty error:', error);
    res.status(500).json({ message: 'Error deleting faculty' });
  }
};

const resetFacultyPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = req.user.department;

    const faculty = await User.findOne({ 
      _id: id, 
      role: 'faculty', 
      department: departmentId 
    });

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Generate new password
    const newPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    faculty.password = hashedPassword;
    await faculty.save();

    // TODO: Send email with new password
    console.log(`New password for ${faculty.email}: ${newPassword}`);

    res.json({ 
      message: 'Password reset successfully', 
      newPassword 
    });
  } catch (error) {
    console.error('Reset faculty password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

// Subjects CRUD
const getSubjects = async (req, res) => {
  try {
    const departmentId = req.user.department;
    const subjects = await Subject.find({ department: departmentId })
      .populate('faculty', 'name')
      .populate('classes', 'name')
      .sort({ createdAt: -1 });

    const formattedSubjects = subjects.map(subject => ({
      _id: subject._id,
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      credits: subject.credits || 3,
      semester: subject.semester || '1st Semester',
      faculty: subject.faculty,
      department: subject.department
    }));

    res.json(formattedSubjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: 'Error fetching subjects' });
  }
};

const createSubject = async (req, res) => {
  try {
    const { name, code, description, credits, semester, faculty } = req.body;
    const departmentId = req.user.department;

    // Check if code already exists
    const existingSubject = await Subject.findOne({ code });
    if (existingSubject) {
      return res.status(400).json({ message: 'Subject code already exists' });
    }

    // Find faculty user
    const facultyUser = await User.findOne({ 
      name: faculty, 
      role: 'faculty', 
      department: departmentId 
    });

    const newSubject = new Subject({
      name,
      code,
      description,
      credits,
      semester,
      department: departmentId,
      faculty: facultyUser ? [facultyUser._id] : []
    });

    await newSubject.save();

    res.status(201).json({ message: 'Subject created successfully', subject: newSubject });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ message: 'Error creating subject' });
  }
};

const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, credits, semester, faculty } = req.body;
    const departmentId = req.user.department;

    const subjectToUpdate = await Subject.findOne({ _id: id, department: departmentId });
    if (!subjectToUpdate) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if code is being changed and if it already exists
    if (code !== subjectToUpdate.code) {
      const existingSubject = await Subject.findOne({ code });
      if (existingSubject) {
        return res.status(400).json({ message: 'Subject code already exists' });
      }
    }

    // Find faculty user
    const facultyUser = await User.findOne({ 
      name: faculty, 
      role: 'faculty', 
      department: departmentId 
    });

    subjectToUpdate.name = name;
    subjectToUpdate.code = code;
    subjectToUpdate.description = description;
    subjectToUpdate.credits = credits;
    subjectToUpdate.semester = semester;
    subjectToUpdate.faculty = facultyUser ? [facultyUser._id] : [];

    await subjectToUpdate.save();

    res.json({ message: 'Subject updated successfully', subject: subjectToUpdate });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ message: 'Error updating subject' });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = req.user.department;

    const subjectToDelete = await Subject.findOne({ _id: id, department: departmentId });
    if (!subjectToDelete) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await Subject.findByIdAndDelete(id);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ message: 'Error deleting subject' });
  }
};

// Students CRUD
const getStudents = async (req, res) => {
  try {
    const departmentId = req.user.department;
    const students = await User.find({ 
      role: 'student', 
      department: departmentId 
    })
    .populate('class', 'name')
    .populate('department', 'name')
    .sort({ createdAt: -1 });

    const formattedStudents = students.map(student => ({
      _id: student._id,
      name: student.name,
      email: student.email,
      phone: student.phone || 'Not provided',
      rollNumber: student.rollNumber || 'Not assigned',
      class: student.class?.name || 'Not assigned',
      semester: student.semester || '1st Semester',
      department: student.department?.name || 'Unknown',
      address: student.address || 'Not provided',
      parentName: student.parentName || 'Not provided',
      parentPhone: student.parentPhone || 'Not provided',
      status: student.status || 'active'
    }));

    res.json(formattedStudents);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Error fetching students' });
  }
};

const createStudent = async (req, res) => {
  try {
    const { 
      name, email, phone, rollNumber, classId, className, semester, 
      address, parentName, parentPhone , password
    } = req.body;
    const departmentId = req.user.department;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Find class by ID
    const classObj = await Class.findOne({ 
      _id: classId,
      department: departmentId 
    });

    // Generate temporary password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new User({
      name,
      email,
      password: hashedPassword,
      role: 'student',
      department: departmentId,
      class: classId || classObj?._id,
      className: className || classObj?.name || '',
      phone,
      rollNumber,
      semester,
      address,
      parentName,
      parentPhone,
      status: 'active'
    });

    await newStudent.save();

    // Update Class model - add student to class
    if (classObj) {
      await Class.findByIdAndUpdate(classObj._id, {
        $push: { students: newStudent._id },
        $inc: { currentStrength: 1 }
      });
    }

    // Update Department model - add student to department
    await Department.findByIdAndUpdate(departmentId, {
      $push: { students: newStudent._id }
    });

    // TODO: Send email with temporary password
    console.log(`Temporary password for ${email}: ${password}`);

    res.status(201).json({ 
      message: 'Student created successfully', 
      student: newStudent,
       
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ message: 'Error creating student' });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, phone, rollNumber, classId, className, semester, 
      address, parentName, parentPhone 
    } = req.body;
    const departmentId = req.user.department;

    const studentToUpdate = await User.findOne({ 
      _id: id, 
      role: 'student',
      department: departmentId 
    });

    if (!studentToUpdate) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if email is being changed and if it already exists
    if (email !== studentToUpdate.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    }

    // Find class by ID
    const classObj = await Class.findOne({ 
      _id: classId,
      department: departmentId 
    });

    // Handle class changes
    const oldClassId = studentToUpdate.class;
    const newClassId = classObj?._id;

    if (oldClassId && oldClassId.toString() !== newClassId?.toString()) {
      // Remove from old class
      await Class.findByIdAndUpdate(oldClassId, {
        $pull: { students: id },
        $inc: { currentStrength: -1 }
      });
    }

    if (newClassId && (!oldClassId || oldClassId.toString() !== newClassId.toString())) {
      // Add to new class
      await Class.findByIdAndUpdate(newClassId, {
        $push: { students: id },
        $inc: { currentStrength: 1 }
      });
    }

    studentToUpdate.name = name;
    studentToUpdate.email = email;
    studentToUpdate.phone = phone;
    studentToUpdate.rollNumber = rollNumber;
    studentToUpdate.class = classObj?._id;
    studentToUpdate.className = className || classObj?.name || '';
    studentToUpdate.semester = semester;
    studentToUpdate.address = address;
    studentToUpdate.parentName = parentName;
    studentToUpdate.parentPhone = parentPhone;

    await studentToUpdate.save();
    res.json({ message: 'Student updated successfully', student: studentToUpdate });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Error updating student' });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = req.user.department;

    const studentToDelete = await User.findOne({ 
      _id: id, 
      role: 'student', 
      department: departmentId 
    });

    if (!studentToDelete) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove from class
    if (studentToDelete.class) {
      await Class.findByIdAndUpdate(studentToDelete.class, {
        $pull: { students: id },
        $inc: { currentStrength: -1 }
      });
    }

    // Remove from department
    await Department.findByIdAndUpdate(departmentId, {
      $pull: { students: id }
    });

    await User.findByIdAndDelete(id);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Error deleting student' });
  }
};

const resetStudentPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const departmentId = req.user.department;

    const student = await User.findOne({ 
      _id: id, 
      role: 'student', 
      department: departmentId 
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Generate new password
    const newPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    student.password = hashedPassword;
    await student.save();

    // TODO: Send email with new password
    console.log(`New password for ${student.email}: ${newPassword}`);

    res.json({ 
      message: 'Password reset successfully', 
      newPassword 
    });
  } catch (error) {
    console.error('Reset student password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

// Helper functions for lists
const getFacultyList = async (req, res) => {
  try {
    const departmentId = req.user.department;
    const faculty = await User.find({ 
      role: 'faculty', 
      department: departmentId 
    })
    .select('name email')
    .sort({ name: 1 });

    res.json(faculty);
  } catch (error) {
    console.error('Get faculty list error:', error);
    res.status(500).json({ message: 'Error fetching faculty list' });
  }
};

const getSubjectsList = async (req, res) => {
  try {
    const departmentId = req.user.department;
    const subjects = await Subject.find({ department: departmentId })
      .select('name code semester academicYear faculty credits')
      .sort({ name: 1 });

    res.json(subjects);
  } catch (error) {
    console.error('Get subjects list error:', error);
    res.status(500).json({ message: 'Error fetching subjects list' });
  }
};

const getClassesList = async (req, res) => {
  try {
    const departmentId = req.user.department;
    const classes = await Class.find({ department: departmentId, status: 'active' })
      .populate('classTeacher', 'name specialization')
      .populate({
        path: 'subjects.subject',
        select: 'name code credits'
      })
      .populate('students', '_id')
      .select('name fullName semester academicYear capacity currentStrength')
      .sort({ semester: 1, name: 1 });

    const formattedClasses = classes.map(cls => {
      const studentCount = cls.students ? cls.students.length : cls.currentStrength || 0;
      const capacityUtilization = cls.capacity > 0 ? ((studentCount / cls.capacity) * 100).toFixed(1) : 0;
      const totalSubjects = cls.subjects ? cls.subjects.length : 0;
      
      return {
        _id: cls._id,
        name: cls.name,
        fullName: cls.fullName,
        semester: cls.semester,
        academicYear: cls.academicYear,
        studentCount: studentCount,
        capacity: cls.capacity,
        capacityUtilization: parseFloat(capacityUtilization),
        totalSubjects: totalSubjects,
        classTeacher: cls.classTeacher?.name || 'Unassigned',
        classTeacherSpecialization: cls.classTeacher?.specialization || 'N/A'
      };
    });
   
    res.json(formattedClasses);
  } catch (error) {
    console.error('Get classes list error:', error);
    res.status(500).json({ message: 'Error fetching classes list' });
  }
};

module.exports = {
  getDashboard,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  resetFacultyPassword,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  resetStudentPassword,
  getFacultyList,
  getSubjectsList,
  getClassesList
}; 