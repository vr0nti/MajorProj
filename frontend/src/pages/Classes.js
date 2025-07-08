import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import '../styles/classes.css';

// Temporary passwords from environment variables
const STUDENT_TEMP_PASSWORD = process.env.REACT_APP_STUDENT_TEMP_PASSWORD || 'Student@123';
const FACULTY_TEMP_PASSWORD = process.env.REACT_APP_FACULTY_TEMP_PASSWORD || 'Faculty@123';
const DEPARTMENT_ADMIN_TEMP_PASSWORD = process.env.REACT_APP_DEPARTMENT_ADMIN_TEMP_PASSWORD || 'Admin@123';

export default function Classes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filters, setFilters] = useState({
    departmentId: '',
    academicYear: '',
    semester: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
    classTeacherId: '',
    academicYear: '',
    semester: '',
    capacity: 60,
    status: 'active'
  });

  const [allSubjects, setAllSubjects] = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);
  const [subjectFacultyAssignments, setSubjectFacultyAssignments] = useState([]); // [{subject, faculty}]

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    if (formData.departmentId && formData.semester) {
      fetchSubjectsAndFaculty();
    }
  }, [formData.departmentId, formData.semester]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch classes with filters
      const classParams = new URLSearchParams();
      if (filters.departmentId) classParams.append('departmentId', filters.departmentId);
      if (filters.academicYear) classParams.append('academicYear', filters.academicYear);
      if (filters.semester) classParams.append('semester', filters.semester);
      
      const [classesRes, departmentsRes, facultyRes] = await Promise.all([
        api.get(`/classes/all?${classParams}`),
        api.get('/departments/all'),
        api.get('/users/faculty')
      ]);

      setClasses(classesRes.data);
      setDepartments(departmentsRes.data);
      setFaculty(facultyRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsAndFaculty = async () => {
    try {
      const [subjectsRes, facultyRes] = await Promise.all([
        api.get(`/department-admin/subjects-list?departmentId=${formData.departmentId}&semester=${formData.semester}`),
        api.get(`/department-admin/faculty?departmentId=${formData.departmentId}`)
      ]);
      setAllSubjects(subjectsRes.data);
      setAllFaculty(facultyRes.data);
      // If editing, prefill assignments
      if (selectedClass && selectedClass.subjects) {
        setSubjectFacultyAssignments(selectedClass.subjects.map(s => ({
          subject: s.subject._id || s.subject,
          faculty: s.faculty._id || s.faculty
        })));
      } else {
        setSubjectFacultyAssignments(subjectsRes.data.map(s => ({ subject: s._id, faculty: '' })));
      }
    } catch (err) {
      setAllSubjects([]);
      setAllFaculty([]);
      setSubjectFacultyAssignments([]);
    }
  };

  const handleAssignmentChange = (subjectId, facultyId) => {
    setSubjectFacultyAssignments(prev => prev.map(a =>
      a.subject === subjectId ? { ...a, faculty: facultyId } : a
    ));
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/classes/${selectedClass._id}`, {
        ...formData,
        subjects: subjectFacultyAssignments.filter(a => a.faculty)
      });
      setShowEditModal(false);
      setSelectedClass(null);
      setFormData({
        name: '',
        departmentId: '',
        classTeacherId: '',
        academicYear: '',
        semester: '',
        capacity: 60,
        status: 'active'
      });
      fetchData();
    } catch (error) {
      console.error('Error updating class:', error);
    }
  };

  const handleDeleteClass = async () => {
    try {
      await api.delete(`/classes/${selectedClass._id}`);
      setShowDeleteModal(false);
      setSelectedClass(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const openEditModal = (classData) => {
    setSelectedClass(classData);
    setFormData({
      name: classData.name,
      departmentId: classData.department._id,
      classTeacherId: classData.classTeacher?._id || '',
      academicYear: classData.academicYear,
      semester: classData.semester,
      capacity: classData.capacity,
      status: classData.status
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (classData) => {
    setSelectedClass(classData);
    setShowDeleteModal(true);
  };

  const getDepartmentName = (departmentId) => {
    const dept = departments.find(d => d._id === departmentId);
    return dept ? dept.name : 'Unknown';
  };

  const getFacultyName = (facultyId) => {
    const teacher = faculty.find(f => f._id === facultyId);
    return teacher ? teacher.name : 'Not Assigned';
  };

  if (loading) {
    return (
      <div className="classes-container">
        <div className="loading">Loading classes...</div>
      </div>
    );
  }

  return (
    <div className="classes-container">
      <button 
        onClick={() => navigate('/dashboard')} 
        className="back-btn"
      >
        ← Back to Dashboard
      </button>
      
      <div className="classes-header">
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }}
          className="header-content"
        >
          <h1>Class Management</h1>
          <p>
            {user?.role === 'admin' 
              ? 'View all classes across the system (View-only access)' 
              : 'Manage class sections within departments'
            }
          </p>
          
        </motion.div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Department:</label>
          <select 
            value={filters.departmentId} 
            onChange={(e) => setFilters({...filters, departmentId: e.target.value})}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>{dept.name}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Academic Year:</label>
          <select 
            value={filters.academicYear} 
            onChange={(e) => setFilters({...filters, academicYear: e.target.value})}
          >
            <option value="">All Years</option>
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
            <option value="2022-23">2022-23</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Semester:</label>
          <select 
            value={filters.semester} 
            onChange={(e) => setFilters({...filters, semester: e.target.value})}
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

      {/* Statistics */}
      <div className="stats-section">
        <div className="stat-card">
          <h3>{classes.length}</h3>
          <p>Total Classes</p>
        </div>
        <div className="stat-card">
          <h3>{classes.filter(cls => cls.status === 'active').length}</h3>
          <p>Active Classes</p>
        </div>
        <div className="stat-card">
          <h3>{classes.reduce((total, cls) => total + (cls.students?.length || 0), 0)}</h3>
          <p>Total Students</p>
        </div>
        <div className="stat-card">
          <h3>{departments.length}</h3>
          <p>Departments</p>
        </div>
      </div>

      {/* Classes Table */}
      <div className="classes-table">
        <table>
          <thead>
            <tr>
              <th>Class Name</th>
              <th>Department</th>
              <th>Class Teacher</th>
              <th>Academic Year</th>
              <th>Semester</th>
              <th>Students</th>
              <th>Status</th>
              {user?.role !== 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {classes.map(classData => (
              <tr key={classData._id}>
                <td>{classData.fullName || classData.name}</td>
                <td>{classData.department?.name}</td>
                <td>{classData.classTeacher?.name || 'Not Assigned'}</td>
                <td>{classData.academicYear}</td>
                <td>{classData.semester}</td>
                <td>{classData.students?.length || 0}</td>
                <td>
                  <span className={`status-badge status-${classData.status}`}>
                    {classData.status}
                  </span>
                </td>
                {user?.role !== 'admin' && (
                  <td>
                    <div className="actions">
                      <button 
                        className="edit-btn"
                        onClick={() => openEditModal(classData)}
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => openDeleteModal(classData)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        
        {classes.length === 0 && (
          <div className="no-data">
            <p>No classes found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Admin Notice */}
      {user?.role === 'admin' && (
        <div className="admin-notice">
          <div className="notice-card">
            <h5>View-Only Access</h5>
            <p>
              As a Super Admin, you have view-only access to all class data. 
              Department admins are responsible for creating and managing classes within their departments.
            </p>
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
              <div className="form-group">
                <label>Class Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., A, B, C"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Class Teacher</label>
                <select
                  value={formData.classTeacherId}
                  onChange={(e) => setFormData({...formData, classTeacherId: e.target.value})}
                >
                  <option value="">Select Teacher</option>
                  {faculty.map(teacher => (
                    <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Academic Year</label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                  >
                    <option value="">Select Year</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2022-23">2022-23</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({...formData, semester: e.target.value})}
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
                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    min="1"
                    max="200"
                  />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              {allSubjects.length > 0 && (
                <div className="form-group">
                  <label>Assign Faculty to Subjects</label>
                  {allSubjects.map(subject => (
                    <div key={subject._id} className="subject-assignment-row">
                      <span>{subject.name}</span>
                      <select
                        value={subjectFacultyAssignments.find(a => a.subject === subject._id)?.faculty || ''}
                        onChange={e => handleAssignmentChange(subject._id, e.target.value)}
                      >
                        <option value="">Select Faculty</option>
                        {allFaculty.map(fac => (
                          <option key={fac._id} value={fac._id}>{fac.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
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
          <div className="modal">
            <div className="modal-header">
              <h2>Delete Class</h2>
              <button onClick={() => setShowDeleteModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the class "{selectedClass?.name}"?</p>
              <p className="warning">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleDeleteClass} className="delete-btn">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 