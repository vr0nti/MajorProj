import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import '../styles/department-classes.css';
import TimetableForm from './TimetableForm';

const DepartmentClasses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    classTeacherId: '',
    academicYear: '',
    semester: '',
    capacity: 60,
    status: 'active'
  });
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [timetableClass, setTimetableClass] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);
  const [semesterSubjects, setSemesterSubjects] = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);
  const [subjectFacultyAssignments, setSubjectFacultyAssignments] = useState([]); // [{subject, faculty}]
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facultyModalClass, setFacultyModalClass] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch all subjects and faculty for department/semester for add form
  useEffect(() => {
    if (showAddModal && formData.semester) {
      fetchSubjectsAndFaculty();
    }
  }, [showAddModal, formData.semester]);

  // Reset assignments when semester or academic year changes or when subject list arrives
  useEffect(() => {
    setSubjectFacultyAssignments([]);
    setSemesterSubjects(allSubjects.filter(s => s.semester === formData.semester));
  }, [formData.semester, formData.academicYear, allSubjects]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // For department admins, fetch only their department's data
      const [classesRes, facultyRes, subjectsRes] = await Promise.all([
        api.get(`/class/all?departmentId=${user.department}`),
        api.get(`/user/faculty?departmentId=${user.department}`),
        api.get(`/department-admin/subjects-list?departmentId=${user.department}`)
      ]);
      console.log(subjectsRes.data);
      setClasses(classesRes.data);
      setFaculty(facultyRes.data);
      setSubjects(subjectsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsAndFaculty = async () => {
    try {

      setAllSubjects(subjects);
      setAllFaculty(faculty);
      setSubjectFacultyAssignments(
        subjects
          .filter(s => s.semester === formData.semester)
          .map(s => ({ subject: s._id, faculty: '' }))
      );
    } catch (err) {
      setAllSubjects([]);
      setAllFaculty([]);
      setSubjectFacultyAssignments([]);
    }
  };

  const handleAssignmentChange = (subjectId, facultyId) => {
    console.log(subjectId, facultyId);
    console.log(subjectFacultyAssignments);
    setSubjectFacultyAssignments(prev => {
      const idx = prev.findIndex(a => a.subject === subjectId);
      if (idx !== -1) {
        return prev.map(a => a.subject === subjectId ? { ...a, faculty: facultyId } : a);
      }
      // not found, add new entry
      return [...prev, { subject: subjectId, faculty: facultyId }];
    });
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      await api.post('/department-admin/classes', {
        ...formData,
        departmentId: user.department,
        subjects: subjectFacultyAssignments.filter(a => a.faculty)
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        classTeacherId: '',
        academicYear: '',
        semester: '',
        capacity: 60,
        status: 'active'
      });
      setSubjectFacultyAssignments([]);
      fetchData();
    } catch (error) {
      console.error('Error adding class:', error);
    }
  };

  const openEditModal = async (classData) => {
    console.log(classData);
    setSelectedClass(classData);
    setFormData({
      name: classData.name,
      classTeacherId: classData.classTeacher?._id || '',
      academicYear: classData.academicYear,
      semester: classData.semester,
      capacity: classData.capacity,
      status: classData.status
    });
    // Prefill assignments for the class's subjects

    setSemesterSubjects(allSubjects.filter(s => s.semester === classData.semester));
    if (classData.subjects && classData.subjects.length > 0) {
      setSubjectFacultyAssignments(
        (classData.subjects || []).map(s => ({
          subject: s.subject._id || s.subject,
          faculty: s.faculty?._id || s.faculty || ''
        }))
      );
    }
    else {
      setAllFaculty(faculty);
      setAllSubjects(subjects);
      setSubjectFacultyAssignments(subjects.filter(s => s.semester === classData.semester).map(s => ({ subject: s._id, faculty: '' })));
    }
    setShowEditModal(true);
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/department-admin/classes/${selectedClass._id}`, {
        ...formData,
        subjects: subjectFacultyAssignments // allow empty faculty
      });
      setShowEditModal(false);
      setSelectedClass(null);
      setFormData({
        name: '',
        classTeacherId: '',
        academicYear: '',
        semester: '',
        capacity: 60,
        status: 'active'
      });
      setSubjectFacultyAssignments([]);
      fetchData();
    } catch (error) {
      console.error('Error updating class:', error);
    }
  };

  // When semester changes in edit form, update subject list and reset assignments
  useEffect(() => {
    if (showEditModal) {
      setSemesterSubjects(allSubjects.filter(s => s.semester === formData.semester));

    }
  }, [formData.semester, formData.academicYear, showEditModal, allSubjects]);

  const handleDeleteClass = async () => {
    try {
      await api.delete(`/department-admin/classes/${selectedClass._id}`);
      setShowDeleteModal(false);
      setSelectedClass(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const openDeleteModal = (classData) => {
    setSelectedClass(classData);
    setShowDeleteModal(true);
  };

  const openFacultyModal = (cls) => {
    setFacultyModalClass(cls);
    setShowFacultyModal(true);
  };

  const closeFacultyModal = () => {
    setShowFacultyModal(false);
    setFacultyModalClass(null);
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.classTeacher?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = !filterYear || cls.academicYear === filterYear;
    const matchesSemester = !filterSemester || cls.semester === filterSemester;

    return matchesSearch && matchesYear && matchesSemester;
  });

  if (loading) {
    return (
      <div className="classes-container">
        <div className="loading">Loading classes...</div>
      </div>
    );
  }

  return (
    <div className="classes-container">
      <div className="classes-header">
        <div className="header-content">
          <h1>Department Classes</h1>
          <p>Manage class sections in your department</p>
        </div>
        <Link to="/dashboard" className="back-btn">
          Back to Dashboard
        </Link>
      </div>

      <div className="controls-section">
        <div className="search-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filters">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="">All Years</option>
              <option value="2025-26">2025-26</option>
              <option value="2024-25">2024-25</option>
              <option value="2023-24">2023-24</option>
              <option value="2022-23">2022-23</option>
            </select>

            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
            >
              <option value="">All Semesters</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="3rd Semester">3rd Semester</option>
              <option value="4th Semester">4th Semester</option>
              <option value="5th Semester">5th Semester</option>
              <option value="6th Semester">6th Semester</option>
              <option value="7th Semester">7th Semester</option>
              <option value="8th Semester">8th Semester</option>
            </select>
          </div>
        </div>

        <button
          className="add-btn"
          onClick={() => {
            setShowAddModal(true); setFormData({
              name: '',
              classTeacherId: '',
              academicYear: '',
              semester: '',
              capacity: 60,
              status: 'active'
            });
          }}
        >
          + Add New Class
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Classes</h3>
          <p>{classes.length}</p>
        </div>
        <div className="stat-card">
          <h3>Active Classes</h3>
          <p>{classes.filter(cls => cls.status === 'active').length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Students</h3>
          <p>{classes.reduce((total, cls) => total + (cls.students?.length || 0), 0)}</p>
        </div>
        <div className="stat-card">
          <h3>Faculty Members</h3>
          <p>{faculty.length}</p>
        </div>
      </div>

      <div className="classes-table">
        <table>
          <thead>
            <tr>
              <th>Class Name</th>
              <th>Class Teacher</th>
              <th>Academic Year</th>
              <th>Semester</th>
              {/* <th>Capacity</th> */}
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClasses.map(cls => (
              <tr key={cls._id}>
                <td>
                  <div className="class-info">
                    <h4>{cls.name}</h4>
                    {cls.description && <p>{cls.description}</p>}
                  </div>
                </td>
                <td>{cls.classTeacher?.name}</td>
                <td>{cls.academicYear}</td>
                <td>{cls.semester}</td>
                {/* <td>{cls.capacity}</td> */}
                <td>{cls.status}</td>
                <td>
                  <div className="actions">
                    <button
                      className="edit-btn"
                      onClick={() => openEditModal(cls)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => openDeleteModal(cls)}
                    >
                      Delete
                    </button>
                    {user.role === 'departmentAdmin' && (
                      <button
                        className="timetable-btn"
                        onClick={() => { setTimetableClass(cls); setShowTimetableModal(true); }}
                      >
                        {cls.timetable ? "Edit Timetable" : "Create Timetable"}
                      </button>
                    )}
                    <button
                      className="view-faculty-btn"
                      onClick={() => openFacultyModal(cls)}
                    >
                      View Assigned Faculty
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredClasses.length === 0 && (
          <div className="no-data">
            <p>No classes found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Class</h2>
              <button onClick={() => setShowAddModal(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={handleAddClass}>
              <div className="form-row">
                <div className="form-group">
                  <label>Class Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., A, B, C"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <select
                    value={formData.academicYear}
                    onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                    required
                  >
                    <option value="">Select Academic Year</option>
                    <option value="2025-26">2025-26</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2022-23">2022-23</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Class Teacher</label>
                  <select
                    value={formData.classTeacherId}
                    onChange={e => setFormData({ ...formData, classTeacherId: e.target.value })}
                  >
                    <option value="">Select Class Teacher</option>
                    {faculty.map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={formData.semester}
                    onChange={e => setFormData({ ...formData, semester: e.target.value })}
                    required
                  >
                    <option value="">Select Semester</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="3rd Semester">3rd Semester</option>
                    <option value="4th Semester">4th Semester</option>
                    <option value="5th Semester">5th Semester</option>
                    <option value="6th Semester">6th Semester</option>
                    <option value="7th Semester">7th Semester</option>
                    <option value="8th Semester">8th Semester</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                {/* <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    min="1"
                    max="200"
                    required
                  />
                </div> */}
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {semesterSubjects.length > 0 && (
                <div className="subject-assignment-section">
                  <h3>Assign Faculty to Subjects</h3>
                  <div className="subject-cards-grid">
                    {semesterSubjects.map(subject => (
                      <div key={subject._id} className="subject-card enhanced">
                        <div className="subject-info">
                          <strong>{subject.name}</strong>
                          <div className="subject-meta">Code: {subject.code} | Credits: {subject.credits}</div>
                          <div className="subject-meta">Semester: {subject.semester}</div>
                        </div>
                        <div className="faculty-select-row">
                          <label>Faculty</label>
                          <select
                            value={subjectFacultyAssignments.find(a => a.subject === subject._id)?.faculty || ''}
                            onChange={e => handleAssignmentChange(subject._id, e.target.value)}

                          >
                            <option value="">Select Faculty</option>
                            {allFaculty.filter(fac => subject.faculty?.includes(fac._id)).map(fac => (
                              <option key={fac._id} value={fac._id}>{fac.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Class</h2>
              <button onClick={() => setShowEditModal(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={handleEditClass}>
              <div className="form-row">
                <div className="form-group">
                  <label>Class Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., A, B, C"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <select
                    value={formData.academicYear}
                    onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                    required
                  >
                    <option value="">Select Academic Year</option>
                    <option value="2025-26">2025-26</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2022-23">2022-23</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Class Teacher</label>
                  <select
                    value={formData.classTeacherId}
                    onChange={e => setFormData({ ...formData, classTeacherId: e.target.value })}
                  >
                    <option value="">Select Class Teacher</option>
                    {faculty.map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={formData.semester}
                    onChange={e => setFormData({ ...formData, semester: e.target.value })}
                    required
                  >
                    <option value="">Select Semester</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="3rd Semester">3rd Semester</option>
                    <option value="4th Semester">4th Semester</option>
                    <option value="5th Semester">5th Semester</option>
                    <option value="6th Semester">6th Semester</option>
                    <option value="7th Semester">7th Semester</option>
                    <option value="8th Semester">8th Semester</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                {/* <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    min="1"
                    max="200"
                    required
                  />
                </div> */}
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {semesterSubjects.length > 0 && (
                <div className="subject-assignment-section">
                  <h3>Assign Faculty to Subjects</h3>
                  <div className="subject-cards-grid">
                    {semesterSubjects.map(subject => (
                      <div key={subject._id} className="subject-card enhanced">
                        <div className="subject-info">
                          <strong>{subject.name}</strong>
                          <div className="subject-meta">Code: {subject.code} | Credits: {subject.credits}</div>
                          <div className="subject-meta">Semester: {subject.semester}</div>
                        </div>
                        <div className="faculty-select-row">
                          <label>Faculty</label>
                          <select
                            value={subjectFacultyAssignments.find(a => a.subject === subject._id)?.faculty || ''}
                            onChange={e => handleAssignmentChange(subject._id, e.target.value)}

                          >
                            <option value="">Select Faculty</option>
                            {allFaculty.filter(fac => subject.faculty?.includes(fac._id)).map(fac => (
                              <option key={fac._id} value={fac._id}>{fac.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <div className="modal-header">
              <h2>Delete Class</h2>
              <button
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete the class "{selectedClass?.name}"?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button onClick={handleDeleteClass} className="delete-btn">
                Delete Class
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimetableModal && timetableClass && (
        <div className="modal-overlay" onClick={() => setShowTimetableModal(false)}>
          <div className="modal timetable-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowTimetableModal(false)}>×</button>
            <TimetableForm
              classId={timetableClass._id}
              departmentId={timetableClass.department}
              semester={timetableClass.semester}
              academicYear={timetableClass.academicYear}
              className={timetableClass.name}
              onSuccess={() => { setShowTimetableModal(false); fetchData(); }}
            />
          </div>
        </div>
      )}

      {showFacultyModal && facultyModalClass && (
        console.log(facultyModalClass),
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Assigned Faculty for {facultyModalClass.name}</h2>
              <button onClick={closeFacultyModal} className="close-btn">×</button>
            </div>
            <div className="modal-content">
              {facultyModalClass.subjects && facultyModalClass.subjects.length > 0 ? (
                <table className="assigned-faculty-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {console.log(subjects)}
                    {facultyModalClass.subjects.map((s, idx) => (
                      <tr key={idx}>
                        <td>{subjects.find(sub => sub._id === s.subject)?.name || 'Unknown'}</td>
                        <td>{faculty.find(fac => fac._id === s.faculty)?.name || 'Not Assigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No subjects assigned to this class.</p>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={closeFacultyModal} className="cancel-btn">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentClasses; 
