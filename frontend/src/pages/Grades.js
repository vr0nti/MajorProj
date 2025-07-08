import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import useAuth  from '../hooks/useAuth';
import '../styles/grades.css';

const Grades = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    studentId: '',
    subjectId: '',
    classId: '',
    semester: '',
    academicYear: '',
    gradeType: 'assignment',
    gradeValue: '',
    maxMarks: 100,
    remarks: ''
  });

  // Filters
  const [filters, setFilters] = useState({
    classId: '',
    subjectId: '',
    semester: '',
    academicYear: ''
  });

  const semesters = ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'];
  const gradeTypes = ['assignment', 'midterm', 'final', 'project', 'quiz'];
  const academicYears = ['2023-24', '2024-25', '2025-26'];

  // Student grades state
  const [studentGrades, setStudentGrades] = useState([]);
  const [semesterResults, setSemesterResults] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [studentLoading, setStudentLoading] = useState(true);

  // New state for student view
  const [subjectGrades, setSubjectGrades] = useState([]);
  const [semesterLoading, setSemesterLoading] = useState(false);
  const [semesterError, setSemesterError] = useState('');

  useEffect(() => {
    if (user.role === 'faculty') {
      fetchGrades();
      fetchStudents();
      fetchSubjects();
      fetchClasses();
    } else if (user.role === 'student') {
      fetchStudentData();
    }
  }, [user, filters, selectedSemester]);

  // Effect for fetching semester grades when semester is selected
  useEffect(() => {
    if (user.role === 'student' && selectedSemester) {
      const gradesArr = (user.grades && user.grades.length > 0) ? user.grades : [];
      const semObj = gradesArr.find(g => g.semester === selectedSemester);
    //   console.log("gradesArr",gradesArr);
    //   console.log("semObj",semObj);
      if (semObj && semObj.released) {
        setSemesterLoading(true);
        setSemesterError('');
        axios.get(`/grade/student/${user.id}?semester=${selectedSemester}`)
          .then(res => {
            setSubjectGrades(groupGradesBySubject(res.data));
          })
          .catch(() => {
            setSemesterError('Failed to fetch grades for this semester.');
          })
          .finally(() => {
            setSemesterLoading(false);
          });
      } else {
        setSubjectGrades([]);
        setSemesterLoading(false);
        setSemesterError('');
      }
    }
  }, [selectedSemester, user.id, user.grades, user.role]);

  // Effect to reset selected semester if not released
  useEffect(() => {
    if (user.role === 'student' && selectedSemester) {
      const gradesArr = (user.grades && user.grades.length > 0) ? user.grades : [];
      const releasedSemesters = gradesArr.filter(g => g.released).map(g => g.semester);
      if (!releasedSemesters.includes(selectedSemester)) {
        setSelectedSemester('');
      }
    }
  }, [user.grades, selectedSemester, user.role]);

  const fetchStudentData = async () => {
    setStudentLoading(true);
    try {
      // Fetch semester results to get available semesters
      const resultsRes = await axios.get(`/grade/semester-results/${user.id}`);
      setSemesterResults(resultsRes.data);
      console.log("resultsRes",resultsRes.data);
      
      // Get available semesters (completed or in progress)
      const semesters = resultsRes.data.map(result => result.semester);
      setAvailableSemesters(semesters);
      
      
      // Fetch detailed grades for selected semester
      if (selectedSemester) {
        const gradesRes = await axios.get(`/grade/student/${user.id}?semester=${selectedSemester}`);
        setStudentGrades(gradesRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch student data:', err);
      setError('Failed to fetch grades');
    } finally {
      setStudentLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.classId) params.append('classId', filters.classId);
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);

      const response = await axios.get(`/grade/class?${params}`);
      setGrades(response.data);
    } catch (err) {
      setError('Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get('/department-admin/students');
      setStudents(response.data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get('/subject/all');
      setSubjects(response.data);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get('/class/all');
      setClasses(response.data);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGrade) {
        await axios.put(`/grade/update/${editingGrade._id}`, formData);
        setEditingGrade(null);
      } else {
        await axios.post('/grade/add', formData);
      }
      
      setFormData({
        studentId: '',
        subjectId: '',
        classId: '',
        semester: '',
        academicYear: '',
        gradeType: 'assignment',
        gradeValue: '',
        maxMarks: 100,
        remarks: ''
      });
      setShowAddForm(false);
      fetchGrades();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save grade');
    }
  };

  const handleEdit = (grade) => {
    setEditingGrade(grade);
    setFormData({
      studentId: grade.student._id,
      subjectId: grade.subject._id,
      classId: grade.class._id,
      semester: grade.semester,
      academicYear: grade.academicYear,
      gradeType: grade.gradeType,
      gradeValue: grade.gradeValue,
      maxMarks: grade.maxMarks,
      remarks: grade.remarks || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (gradeId) => {
    if (window.confirm('Are you sure you want to delete this grade?')) {
      try {
        await axios.delete(`/grade/delete/${gradeId}`);
        fetchGrades();
      } catch (err) {
        setError('Failed to delete grade');
      }
    }
  };

  const getGradeLetter = (percentage, isAbsent = false) => {
    if (isAbsent) return 'Ab';
    if (percentage >= 90) return 'S';
    if (percentage >= 80) return 'A+';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B+';
    if (percentage >= 50) return 'B';
    if (percentage >= 40) return 'P';
    return 'F';
  };

  const getGradePoints = (percentage, isAbsent = false) => {
    if (isAbsent) return 0;
    if (percentage >= 90) return 10;
    if (percentage >= 80) return 9;
    if (percentage >= 70) return 8;
    if (percentage >= 60) return 7;
    if (percentage >= 50) return 6;
    if (percentage >= 40) return 5;
    return 0;
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'S': return '#28a745';
      case 'A+': return '#20c997';
      case 'A': return '#17a2b8';
      case 'B+': return '#ffc107';
      case 'B': return '#fd7e14';
      case 'C+': return '#e83e8c';
      case 'C': return '#6f42c1';
      case 'D+': return '#dc3545';
      case 'D': return '#6c757d';
      case 'F': return '#343a40';
      default: return '#6c757d';
    }
  };

  // Group grades by subject
  const groupGradesBySubject = (grades) => {
    const grouped = {};
    grades.forEach(grade => {
      const subjectId = grade.subject._id;
      if (!grouped[subjectId]) {
        grouped[subjectId] = {
          subject: grade.subject,
          grades: [],
          midExam1: 0,
          midExam2: 0,
          internalMarks: 0,
          externalMarks: 0,
          totalMarks: 0,
          percentage: 0,
          letterGrade: null,
          gradePoints: 0,
          hasExternalMarks: false,
          hasAllMarks: false
        };
      }
      grouped[subjectId].grades.push(grade);
    });

    // Calculate totals for each subject
    Object.values(grouped).forEach(subjectData => {
      // Use the first grade entry for this subject (all entries should have same marks)
      const firstGrade = subjectData.grades[0];
      
      // Get marks from the new grade structure
      subjectData.midExam1 = firstGrade.midExam1 || 0;
      subjectData.midExam2 = firstGrade.midExam2 || 0;
      subjectData.internalMarks = firstGrade.internalMarks || 0;
      subjectData.externalMarks = firstGrade.externalMarks || 0;
      subjectData.totalMarks = firstGrade.totalMarks || 0;
      
      // Check if all required marks are present
      const hasInternalMarks = firstGrade.internalMarks !== null && firstGrade.internalMarks !== undefined;
      const hasExternalMarks = firstGrade.externalMarks !== null && firstGrade.externalMarks !== undefined;
      const hasTotalMarks = firstGrade.totalMarks !== null && firstGrade.totalMarks !== undefined;
      
      subjectData.hasExternalMarks = hasExternalMarks;
      subjectData.hasAllMarks = hasInternalMarks && hasExternalMarks && hasTotalMarks;
      
      // Calculate percentage (total marks is already out of 100)
      subjectData.percentage = subjectData.totalMarks;

      // Only calculate letter grade if all marks are present
      if (subjectData.hasAllMarks) {
        subjectData.letterGrade = getGradeLetter(subjectData.percentage);
        subjectData.gradePoints = getGradePoints(subjectData.percentage);
      }
    });

    return Object.values(grouped);
  };

  // Calculate SGPA for current semester
  const calculateSGPA = (subjectGrades) => {
    let totalCredits = 0;
    let totalGradePoints = 0;

    subjectGrades.forEach(subject => {
      if (subject.hasAllMarks) {
        const credits = subject.subject.credits || 3;
        totalCredits += credits;
        totalGradePoints += (subject.gradePoints * credits);
      }
    });

    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
  };

  // Get current semester result
  const getCurrentSemesterResult = () => {
    return semesterResults.find(result => result.semester === selectedSemester);
  };

  // Calculate CGPA from all completed semesters
  const calculateCGPA = () => {
    const completedSemesters = semesterResults.filter(result => result.isCompleted);
    if (completedSemesters.length === 0) return '0.00';

    let totalCredits = 0;
    let totalGradePoints = 0;

    completedSemesters.forEach(semester => {
      totalCredits += semester.earnedCredits;
      totalGradePoints += semester.totalGradePoints;
    });

    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
  };

  // Student Grades View
  if (user.role === 'student') {
    // Always show 8 semesters
    const allSemesters = [
      '1st Semester', '2nd Semester', '3rd Semester', '4th Semester',
      '5th Semester', '6th Semester', '7th Semester', '8th Semester'
    ];
    // Map from backend grades array

    const gradesArr = (user.grades && user.grades.length > 0) ? user.grades : allSemesters.map(sem => ({ semester: sem, isSemesterCompleted: false, sgpa: 0, released: false }));
  
    // CGPA: average of completed and released SGPAs
    const completedReleased = gradesArr.filter(g => g.released);
    const cgpa = completedReleased.length > 0 ? (completedReleased.reduce((sum, g) => sum + g.sgpa, 0) / completedReleased.length).toFixed(2) : '0.00';
    
    // Get current semester object
    const currentSemesterObj = gradesArr.find(g => g.semester === selectedSemester);
    const sgpa = currentSemesterObj && currentSemesterObj.released ? currentSemesterObj.sgpa.toFixed(2) : '0.00';

    return (
      <div className="grades-container">
        <div className="grades-header">
          <h1>My Academic Performance</h1>
        </div>
        {/* Semester Selection */}
    
        <div className="semester-selection">
          <label htmlFor="semester-select">Select Semester:</label>
          <select
            id="semester-select"
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value)}
            className="semester-select"
          >
            <option value="">Select a semester</option>
            {/* {console.log("gradesArr",gradesArr)} */}
            {gradesArr.map(g => (
              <option key={g.semester} value={g.semester} disabled={!g.released}>
                {g.semester} {g.released ? '' : '(Not Released)'}
              </option>
            ))}
          </select>
        </div>
        
        {/* Show SGPA/grades only if released */}
        {selectedSemester ? (
          currentSemesterObj && currentSemesterObj.released ? (
            <>
              {semesterLoading ? (
                <div className="loading">Loading grades...</div>
              ) : semesterError ? (
                <div className="error">{semesterError}</div>
              ) : (
                <>
                  {/* Performance Summary */}
                  <div className="performance-summary">
                    <div className="summary-card">
                      <h3>Current Semester (SGPA)</h3>
                      <div className="sgpa-display">
                        <span className="sgpa-value">{sgpa}</span>
                        <span className="sgpa-label">/ 10.0</span>
                      </div>
                      <div className="semester-details">
                        <p>Status: {currentSemesterObj.isSemesterCompleted ? 'Completed' : 'In Progress'}</p>
                      </div>
                    </div>
                  </div>
                  {/* Subject-wise Grades */}
                  <div className="subject-grades-section">
                    <h3>Subject-wise Grades - {selectedSemester}</h3>
                    {subjectGrades.length > 0 ? (
                      <div className="subject-grades-table-container">
                        <table className="subject-grades-table">
                          <thead>
                            <tr>
                              <th>Code</th>
                              <th>Subject</th>
                              <th>Credits</th>
                              <th>Mid 1</th>
                              <th>Mid 2</th>
                              <th>Internal</th>
                              <th>External</th>
                              <th>Total</th>
                              <th>%</th>
                              <th>Grade</th>
                              <th>Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjectGrades.map((subject, index) => (
                              <tr key={index} className={subject.hasAllMarks ? 'grade-complete' : 'grade-incomplete'}>
                                <td>{subject.subject.code}</td>
                                <td>{subject.subject.name}</td>
                                <td>{subject.subject.credits || 3}</td>
                                <td>{subject.midExam1 || '-'}</td>
                                <td>{subject.midExam2 || '-'}</td>
                                <td>{subject.internalMarks || '-'}</td>
                                <td>{subject.externalMarks || '-'}</td>
                                <td>{subject.totalMarks || '-'}</td>
                                <td>{subject.percentage ? subject.percentage.toFixed(1) : '-'}</td>
                                <td>
                                  {subject.hasAllMarks ? (
                                    <span className="subject-grade-badge">{subject.letterGrade}</span>
                                  ) : (
                                    <span className="subject-grade-pending">-</span>
                                  )}
                                </td>
                                <td>{subject.hasAllMarks ? subject.gradePoints : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="no-data">No grades found for this semester.</div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="no-semester-selected">Results not yet released for {selectedSemester}.</div>
          )
        ) : (
          <div className="no-semester-selected">Please select a semester to view your grades.</div>
        )}
        
        {/* CGPA Display */}
        <div className="cgpa-summary">
          <h3>Cumulative (CGPA)</h3>
          <div className="cgpa-display">
            <span className="cgpa-value">{cgpa}</span>
            <span className="cgpa-label">/ 10.0</span>
          </div>
          <div className="cgpa-details">
            <p>Completed Semesters: {completedReleased.length}</p>
          </div>
        </div>
      </div>
    );
  }

  // Faculty Grades View (existing code)
  return (
    <div className="grades-container">
      <div className="grades-header">
        <h1>Grade Management</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Grade'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <select
            value={filters.classId}
            onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
          <select
            value={filters.subjectId}
            onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
          >
            <option value="">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </select>
          <select
            value={filters.semester}
            onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
          >
            <option value="">All Semesters</option>
            {semesters.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </select>
          <select
            value={filters.academicYear}
            onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
          >
            <option value="">All Years</option>
            {academicYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add/Edit Grade Form */}
      {showAddForm && (
        <div className="grade-form-section">
          <h3>{editingGrade ? 'Edit Grade' : 'Add New Grade'}</h3>
          <form onSubmit={handleSubmit} className="grade-form">
            <div className="form-row">
              <div className="form-group">
                <label>Student *</label>
                <select
                  name="studentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} - {student.rollNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <select
                  name="subjectId"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Class *</label>
                <select
                  name="classId"
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Semester *</label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  required
                >
                  <option value="">Select Semester</option>
                  {semesters.map((semester) => (
                    <option key={semester} value={semester}>
                      {semester}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Academic Year *</label>
                <select
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  required
                >
                  <option value="">Select Year</option>
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Grade Type *</label>
                <select
                  name="gradeType"
                  value={formData.gradeType}
                  onChange={(e) => setFormData({ ...formData, gradeType: e.target.value })}
                  required
                >
                  {gradeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Grade Value *</label>
                <input
                  type="number"
                  name="gradeValue"
                  value={formData.gradeValue}
                  onChange={(e) => setFormData({ ...formData, gradeValue: e.target.value })}
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label>Max Marks</label>
                <input
                  type="number"
                  name="maxMarks"
                  value={formData.maxMarks}
                  onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                  min="1"
                  defaultValue="100"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingGrade ? 'Update Grade' : 'Add Grade'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingGrade(null);
                  setFormData({
                    studentId: '',
                    subjectId: '',
                    classId: '',
                    semester: '',
                    academicYear: '',
                    gradeType: 'assignment',
                    gradeValue: '',
                    maxMarks: 100,
                    remarks: ''
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grades Table */}
      <div className="grades-table-section">
        <h3>Grades List</h3>
        {loading ? (
          <div className="loading">Loading grades...</div>
        ) : (
          <div className="table-container">
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Grade</th>
                  <th>Percentage</th>
                  <th>Semester</th>
                  <th>Year</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grades.map(grade => (
                  <tr key={grade._id}>
                    <td>{grade.student?.name}</td>
                    <td>{grade.subject?.name}</td>
                    <td>{grade.gradeType}</td>
                    <td>{grade.gradeValue}/{grade.maxMarks}</td>
                    <td>{grade.percentage?.toFixed(1)}%</td>
                    <td>{grade.semester}</td>
                    <td>{grade.academicYear}</td>
                    <td>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => handleEdit(grade)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(grade._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {grades.length === 0 && (
              <div className="no-data">No grades found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Grades; 
