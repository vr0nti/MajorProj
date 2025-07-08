import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import useAuth from '../hooks/useAuth';
import '../styles/faculty-grades.css';

const semesters = [
  '1st Semester', '2nd Semester', '3rd Semester', '4th Semester',
  '5th Semester', '6th Semester', '7th Semester', '8th Semester'
];
const academicYears = ['2023-24', '2024-25', '2025-26'];

const gradeFields = [
  { key: 'midExam1', label: 'Mid 1 (0-40)', max: 40 },
  { key: 'midExam2', label: 'Mid 2 (0-40)', max: 40 },
  { key: 'externalMarks', label: 'External (0-60)', max: 60 },
];

const getGradeColor = (grade) => {
  if (grade === 'A+') return '#4CAF50';
  if (grade === 'A') return '#8BC34A';
  if (grade === 'B+') return '#FFC107';
  if (grade === 'B') return '#FF9800';
  if (grade === 'C+') return '#FF5722';
  if (grade === 'C') return '#F44336';
  return '#9E9E9E';
};

const FacultyGrades = () => {
  const { user } = useAuth();
  const [selectedSemester, setSelectedSemester] = useState('');
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({}); // { studentId: { midExam1, midExam2, externalMarks } }
  const [editing, setEditing] = useState({}); // { studentId: true/false }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditAll, setIsEditAll] = useState(false); // Track if Edit All mode is active
  const [academicYear, setAcademicYear] = useState(academicYears[0]);

  // Fetch all classes and subjects on mount
  useEffect(() => {
    if (user.role === 'faculty') {
      fetchClasses();
      fetchSubjects();
    }
  }, [user]);

  // Filter classes by semester
  
  useEffect(() => {
    if (selectedSemester) {
      console.log(selectedSemester)
      console.log(classes);
      setFilteredClasses(classes.filter(cls => cls.semester === selectedSemester));
      console.log((classes.filter(cls => cls.semester === selectedSemester)));
      setSelectedClass('');
      setStudents([]);
      setMarks({});
      setEditing({});
      setSelectedSubject('');
      setFilteredSubjects([]);
    }
  }, [selectedSemester, classes]);

  // Filter subjects by class and faculty
  useEffect(() => {
    if (selectedClass) {
      // Find the selected class object
      const cls = classes.find(c => c._id === selectedClass);
      // console.log(cls);
      // console.log(user)
      if (cls && Array.isArray(cls.subjects)) {
        // Only show subjects where faculty matches user.id
        setAcademicYear(cls.academicYear);
        setFilteredSubjects(
          cls.subjects
            .filter(s => (s.faculty) === user.id)
            .map(s => s.subject)
        );
        console.log(filteredSubjects);
      } else {
        setFilteredSubjects([]);
      }
      setSelectedSubject('');
      setStudents([]);
      setMarks({});
      setEditing({});
    }
  }, [selectedClass, classes, user.id]);

  // Fetch students when class is selected
  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    }
  }, [selectedClass]);

  // Fetch marks for all students when subject is selected
  useEffect(() => {
    if (selectedSubject && students.length > 0) {
      fetchAllMarks();
    }
  }, [selectedSubject, students]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/user/faculty/classes');
      setClasses(res.data);
    } catch (err) {
      setError('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/subject/all');
      setSubjects(res.data);
    } catch (err) {
      setError('Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (classId) => {
    setLoading(true);
    try {
      const res = await axios.get(`/class/${classId}/students`);
      setStudents(res.data);
    } catch (err) {
      setError('Failed to fetch students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMarks = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/grade/class?classId=${selectedClass}&subjectId=${selectedSubject}`);
      // Map marks by studentId
      const marksMap = {};
      res.data.forEach(g => {
        marksMap[g.student._id] = {
          midExam1: g.midExam1 ?? '',
          midExam2: g.midExam2 ?? '',
          externalMarks: g.externalMarks ?? '',
          totalMarks: g.totalMarks ?? '',
          grade: g.grade ?? '',
        };
      });
      setMarks(marksMap);
    } catch (err) {
      setError('Failed to fetch marks');
      setMarks({});
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId, field, value) => {
    // Only allow midExam1 and midExam2 to be changed
    if (field !== 'midExam1' && field !== 'midExam2') return;
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
    setEditing(prev => ({ ...prev, [studentId]: true }));
  };

  const handleEdit = (studentId) => {
    setEditing(prev => ({ ...prev, [studentId]: true }));
    setIsEditAll(false); // Ensure Edit All is off if editing individually
  };

  const handleEditAll = () => {
    // Enable editing for all students
    const newEditing = {};
    students.forEach(s => {
      newEditing[s._id] = true;
    });
    setEditing(newEditing);
    setIsEditAll(true);
  };

  const handleSave = async (studentId) => {
    setLoading(true);
    setError('');
    try {
      const m = marks[studentId];
      await axios.post('/grade/mid-exam', {
        studentId,
        subjectId: selectedSubject,
        classId: selectedClass,
        semester: selectedSemester,
        academicYear: academicYear,
        examNumber: 1,
        marks: m.midExam1 !== '' ? Number(m.midExam1) : undefined,
      });
      await axios.post('/grade/mid-exam', {
        studentId,
        subjectId: selectedSubject,
        classId: selectedClass,
        semester: selectedSemester,
        academicYear: academicYear,
        examNumber: 2,
        marks: m.midExam2 !== '' ? Number(m.midExam2) : undefined,
      });
      setEditing(prev => ({ ...prev, [studentId]: false }));
      setSuccess('Marks saved!');
      fetchAllMarks();
    } catch (err) {
      setError('Failed to save marks');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    setError('');
    try {
      for (const student of students) {
        const m = marks[student._id] || {};
        await axios.post('/grade/mid-exam', {
          studentId: student._id,
          subjectId: selectedSubject,
          classId: selectedClass,
          semester: selectedSemester,
          academicYear: academicYear,
          examNumber: 1,
          marks: m.midExam1 !== '' ? Number(m.midExam1) : undefined,
        });
        await axios.post('/grade/mid-exam', {
          studentId: student._id,
          subjectId: selectedSubject,
          classId: selectedClass,
          semester: selectedSemester,
          academicYear: academicYear,
          examNumber: 2,
          marks: m.midExam2 !== '' ? Number(m.midExam2) : undefined,
        });
      }
      setSuccess('All marks saved!');
      fetchAllMarks();
      setIsEditAll(false); // Exit Edit All mode after saving
      setEditing({});
    } catch (err) {
      setError('Failed to save all marks');
    } finally {
      setLoading(false);
    }
  };

  if (user.role !== 'faculty') {
    return (
      <div className="faculty-grades-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Only faculty members can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-grades-container">
      <div className="faculty-grades-header">
        <h1>Batch Marks Entry</h1>
      </div>
      <div className="filters-section">
        <div className="filters-grid">
          <select
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value)}
          >
            <option value="">Select Semester</option>
            {semesters.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            disabled={!selectedSemester}
          >
            <option value="">Select Class</option>
            {filteredClasses.map(cls => (
              <option key={cls._id} value={cls._id}>{cls.fullName || cls.name}</option>
            ))}
          </select>
          {/* {console.log(filteredSubjects)} */}
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            disabled={!selectedClass}
          >
            {/* {console.log("filteredSubjects", filteredSubjects)} */}
            <option value="">Select Subject</option>
            {filteredSubjects.map(sub => (
              <option key={sub} value={sub}>{subjects.find(s => s._id === sub)?.name}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : selectedSubject && students.length > 0 ? (
        <div className="grades-section">
          <h3>Enter Marks for All Students</h3>
          <button className="edit-btn" onClick={handleEditAll} style={{ float: 'right', marginBottom: 10 }} disabled={isEditAll}>
            Edit All
          </button>
          {isEditAll && (
            <button className="submit-btn" onClick={handleSaveAll} style={{ float: 'right', marginBottom: 10, marginRight: 100 }}>
              Save All
            </button>
          )}
          <div className="table-container">
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Student</th>
                  {gradeFields.map(f => <th key={f.key}>{f.label}</th>)}
                  <th>Total</th>
                  <th>Grade</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const m = marks[student._id] || {};
                  const isEditing = !!editing[student._id];
                  return (
                    <tr key={student._id}>
                      <td>{student.name} ({student.rollNumber})</td>
                      {gradeFields.map(f => (
                        <td key={f.key}>
                          <input
                            type="number"
                            min={0}
                            max={f.max}
                            value={m[f.key] ?? ''}
                            disabled={
                              // Only midExam1 and midExam2 are editable, external is always disabled
                              f.key === 'externalMarks' ||
                              (f.key !== 'midExam1' && f.key !== 'midExam2')
                              || (!isEditAll && !isEditing && (f.key === 'midExam1' || f.key === 'midExam2'))
                            }
                            onChange={e => handleMarkChange(student._id, f.key, e.target.value)}
                            style={{ width: 70 }}
                          />
                        </td>
                      ))}
                      <td>{m.totalMarks ?? '-'}</td>
                      <td>
                        {m.grade && (
                          <span className="grade-badge" style={{ backgroundColor: getGradeColor(m.grade) }}>{m.grade}</span>
                        )}
                      </td>
                      <td>
                        {!isEditAll && (
                          !isEditing ? (
                            <button className="edit-btn" onClick={() => handleEdit(student._id)}>Edit</button>
                          ) : (
                            <button className="submit-btn" onClick={() => handleSave(student._id)}>Save</button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FacultyGrades; 