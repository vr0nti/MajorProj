import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import useAuth from '../hooks/useAuth';
import '../styles/department-students.css';

const DepartmentStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const password = process.env.REACT_APP_STUDENT_TEMP_PASSWORD || 'Student@123';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rollNumber: '',
    classId: '',
    className: '',
    semester: '',
    department: '',
    address: '',
    parentName: '',
    parentPhone: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        axios.get('/department-admin/students'),
        axios.get('/department-admin/classes-list')
      ]);
   
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/department-admin/students', {
        ...formData,
        password: password
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        rollNumber: '',
        classId: '',
        className: '',
        semester: '',
        department: '',
        address: '',
        parentName: '',
        parentPhone: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/department-admin/students/${selectedStudent._id}`, formData);
      setShowEditModal(false);
      setSelectedStudent(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        rollNumber: '',
        classId: '',
        className: '',
        semester: '',
        department: '',
        address: '',
        parentName: '',
        parentPhone: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const handleDeleteStudent = async () => {
    try {
      await axios.delete(`/department-admin/students/${selectedStudent._id}`);
      setShowDeleteModal(false);
      setSelectedStudent(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const handleResetPassword = async () => {
    try {
      await axios.post(`/department-admin/students/${selectedStudent._id}/reset-password`);
      setShowResetModal(false);
      setSelectedStudent(null);
      alert('Password reset email sent successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone,
      rollNumber: student.rollNumber,
      classId: student.classId || '',
      className: student.className || '',
      semester: student.semester,
      department: student.department,
      address: student.address,
      parentName: student.parentName,
      parentPhone: student.parentPhone
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (student) => {
    setSelectedStudent(student);
    setShowDeleteModal(true);
  };

  const openResetModal = (student) => {
    setSelectedStudent(student);
    setShowResetModal(true);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !filterClass || student.class === filterClass;
    const matchesSemester = !filterSemester || student.semester === filterSemester;
    const matchesStatus = !filterStatus || student.status === filterStatus;
    
    return matchesSearch && matchesClass && matchesSemester && matchesStatus;
  });

  const semesters = ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'];

  if (loading) {
    return (
      <div className="students-container">
        <div className="loading">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="students-container">
      <div className="students-header">
        <div className="header-content">
          <h1>Department Students</h1>
          <p>Manage students for {user.departmentName || (user.department?.name ?? user.department)}</p>
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
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        
          <div className="filters">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls._id} value={cls.name}>
                  {cls.name} - {cls.semester}
                </option>
              ))}
            </select>
            
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
            >
              <option value="">All Semesters</option>
              {semesters.map(semester => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        
        <button
          className="add-btn"
          onClick={() => {setShowAddModal(true); setFormData({
            name: '',
            email: '',
            phone: '',
            rollNumber: '',
            classId: '',
            className: '',
            semester: '',
            department: '',
            address: '',
            parentName: '',
            parentPhone: ''
          });}}
        >
          + Add New Student
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>{students.length}</h3>
          <p>Total Students</p>
        </div>
        <div className="stat-card">
          <h3>{students.filter(s => s.status === 'active').length}</h3>
          <p>Active Students</p>
        </div>
        <div className="stat-card">
          <h3>{classes.length}</h3>
          <p>Classes</p>
        </div>
      </div>

      <div className="students-table">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Contact</th>
              <th>Academic Info</th>
              <th>Parent Info</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student._id}>
                <td>
                  <div className="student-info">
                    <h4>{student.name}</h4>
                    <p>Roll: {student.rollNumber}</p>
                  </div>
                </td>
                <td>
                  <div className="contact-info">
                    <p>{student.email}</p>
                    <p>{student.phone}</p>
                  </div>
                </td>
                <td>
                  <div className="academic-info">
                    <p>{student.class}</p>
                    <p>{student.semester}</p>
                  </div>
                </td>
                <td>
                  <div className="parent-info">
                    <p>{student.parentName}</p>
                    <p>{student.parentPhone}</p>
                  </div>
                </td>
                <td>
                  <span className={`status ${student.status}`}>
                    {student.status}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button
                      className="edit-btn"
                      onClick={() => openEditModal(student)}
                    >
                      Edit
                    </button>
                    <button
                      className="reset-btn"
                      onClick={() => openResetModal(student)}
                    >
                      Reset Password
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => openDeleteModal(student)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredStudents.length === 0 && (
          <div className="no-data">
            <p>No students found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Student</h2>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Roll Number</label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={formData.semester}
                    onChange={e => setFormData({ ...formData, semester: e.target.value, classId: '', className: '' })}
                    required
                  >
                    <option value=''>Select Semester</option>
                    {semesters.map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Class</label>
                  <select
                    value={formData.classId}
                    onChange={e => {
                      const selectedClass = classes.find(cls => cls._id === e.target.value);
                      setFormData({
                        ...formData,
                        classId: selectedClass?._id || '',
                        className: selectedClass?.name || ''
                      });
                    }}
                    required
                    disabled={!formData.semester}
                  >
                    <option value=''>Select Class</option>
                    {classes.filter(cls => cls.semester === formData.semester).map(cls => (
                      <option key={cls._id} value={cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows="3"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Parent Name</label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Parent Phone</label>
                  <input
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Student</h2>
              <button
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditStudent}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Roll Number</label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={formData.semester}
                    onChange={e => setFormData({ ...formData, semester: e.target.value, classId: '', className: '' })}
                    required
                  >
                    <option value=''>Select Semester</option>
                    {semesters.map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Class</label>
                  <select
                    value={formData.classId}
                    onChange={e => {
                      const selectedClass = classes.find(cls => cls._id === e.target.value);
                      setFormData({
                        ...formData,
                        classId: selectedClass?._id || '',
                        className: selectedClass?.name || ''
                      });
                    }}
                    required
                    disabled={!formData.semester}
                  >
                    <option value=''>Select Class</option>
                    {classes.filter(cls => cls.semester === formData.semester).map(cls => (
                      <option key={cls._id} value={cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows="3"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Parent Name</label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Parent Phone</label>
                  <input
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit">Update Student</button>
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
              <h2>Delete Student</h2>
              <button
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete {selectedStudent?.name}?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button onClick={handleDeleteStudent} className="delete-btn">
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal reset-modal">
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button
                className="close-btn"
                onClick={() => setShowResetModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to reset the password for {selectedStudent?.name}?</p>
              <p>A password reset email will be sent to {selectedStudent?.email}</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowResetModal(false)}>
                Cancel
              </button>
              <button onClick={handleResetPassword} className="reset-btn">
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentStudents; 
