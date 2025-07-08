import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import useAuth from '../hooks/useAuth';
import '../styles/department-faculty.css';

const DepartmentFaculty = () => {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const password = process.env.REACT_APP_FACULTY_TEMP_PASSWORD || 'Faculty@123';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subjects: [],
    qualification: '',
    experience: '',
    designation: '',
    department: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [facultyRes, subjectsRes] = await Promise.all([
        axios.get('/department-admin/faculty'),
        axios.get('/department-admin/subjects-list')
      ]);
      console.log(facultyRes.data);
      setFaculty(facultyRes.data);
      setSubjects(subjectsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    try {
      const subjectIds = formData.subjects.map(s => s._id);
      await axios.post('/department-admin/faculty', {
        ...formData,
        subjectIds,
        password: password
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subjects: [],
        qualification: '',
        experience: '',
        designation: '',
        department: '',
       
      });
      fetchData();
    } catch (error) {
      console.error('Error adding faculty:', error);
    }
  };

  const handleEditFaculty = async (e) => {
    e.preventDefault();
    try {
      const subjectIds = formData.subjects.map(s => s._id);
      await axios.put(`/department-admin/faculty/${selectedFaculty._id}`, {
        ...formData,
        subjectIds
      });
      setShowEditModal(false);
      setSelectedFaculty(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subjects: [],
        qualification: '',
        experience: '',
        designation: '',
        department: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error updating faculty:', error);
    }
  };

  const handleDeleteFaculty = async () => {
    try {
      await axios.delete(`/department-admin/faculty/${selectedFaculty._id}`);
      setShowDeleteModal(false);
      setSelectedFaculty(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting faculty:', error);
    }
  };

  const handleResetPassword = async () => {
    try {
      await axios.post(`/department-admin/faculty/${selectedFaculty._id}/reset-password`);
      setShowResetModal(false);
      setSelectedFaculty(null);
      alert('Password reset email sent successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  const openEditModal = (facultyMember) => {
    setSelectedFaculty(facultyMember);
    setFormData({
      name: facultyMember.name,
      email: facultyMember.email,
      phone: facultyMember.phone,
      subjects: Array.isArray(facultyMember.subjects) ? facultyMember.subjects : [],
      qualification: facultyMember.qualification,
      experience: facultyMember.experience,
      designation: facultyMember.designation,
      department: facultyMember.department
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (facultyMember) => {
    setSelectedFaculty(facultyMember);
    setShowDeleteModal(true);
  };

  const openResetModal = (facultyMember) => {
    setSelectedFaculty(facultyMember);
    setShowResetModal(true);
  };

  const filteredFaculty = faculty.filter(f => {
    const matchesSearch = f.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
                         f.email?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
                         f.subject?.name?.toLowerCase()?.includes(searchTerm.toLowerCase());
    const matchesSubject = !filterSubject || f.subject === filterSubject;
    const matchesStatus = !filterStatus || f.status === filterStatus;
    
    return matchesSearch && matchesSubject && matchesStatus;
  });

  if (loading) {
    return (
      <div className="faculty-container">
        <div className="loading">Loading faculty...</div>
      </div>
    );
  }

  return (
    <div className="faculty-container">
      <div className="faculty-header">
        <div className="header-content">
          <h1>Department Faculty</h1>
          <p>Manage faculty members for {user.departmentName || (user.department?.name ?? user.department)}</p>
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
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filters">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject._id} value={subject.name}>
                  {subject.name}
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
            subjects: [],
            qualification: '',
            experience: '',
            designation: '',
            department: ''
          });}}
        >
          + Add New Faculty
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>{faculty.length}</h3>
          <p>Total Faculty</p>
        </div>
        <div className="stat-card">
          <h3>{faculty.filter(f => f.status === 'active').length}</h3>
          <p>Active Faculty</p>
        </div>
        <div className="stat-card">
          <h3>{subjects.length}</h3>
          <p>Subjects Covered</p>
        </div>
      </div>

      <div className="faculty-table">
        <table>
          <thead>
            <tr>
              <th>Faculty Member</th>
              <th>Contact</th>
              <th>Subject</th>
              <th>Qualification</th>
              <th>Experience</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFaculty.map(facultyMember => (
              <tr key={facultyMember._id}>
                <td>
                  <div className="faculty-info">
                    <h4>{facultyMember.name}</h4>
                    <p>{facultyMember.designation}</p>
                  </div>
                </td>
                <td>
                  <div className="contact-info">
                    <p>{facultyMember.email}</p>
                    <p>{facultyMember.phone}</p>
                  </div>
                </td>
                <td>{facultyMember.subjects?.map(s => s.name).join(', ')}</td>
                <td>{facultyMember.qualification}</td>
                <td>{facultyMember.experience} years</td>
                <td>
                  <span className={`status ${facultyMember.status}`}>
                    {facultyMember.status}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button
                      className="edit-btn"
                      onClick={() => openEditModal(facultyMember)}
                    >
                      Edit
                    </button>
                    {/* <button
                      className="reset-btn"
                      onClick={() => openResetModal(facultyMember)}
                    >
                      Reset Password
                    </button> */}
                    <button
                      className="delete-btn"
                      onClick={() => openDeleteModal(facultyMember)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredFaculty.length === 0 && (
          <div className="no-data">
            <p>No faculty members found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Add Faculty Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Faculty Member</h2>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddFaculty}>
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
                  <label>Subjects (can assign multiple subjects)</label>
                  <select
                    multiple
                    value={formData.subjects.map(s => s._id)}
                    onChange={e => {
                      const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({
                        ...formData,
                        subjects: subjects.filter(s => selectedIds.includes(s._id))
                      });
                    }}
                    required
                  >
                    {subjects.map(subject => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Experience (years)</label>
                  <input
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  required
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Faculty Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Faculty Member</h2>
              <button
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditFaculty}>
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
                  <label>Subjects (can assign multiple subjects)</label>
                  <select
                    multiple
                    value={formData.subjects.map(s => s._id)}
                    onChange={e => {
                      const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({
                        ...formData,
                        subjects: subjects.filter(s => selectedIds.includes(s._id))
                      });
                    }}
                    required
                  >
                    {subjects.map(subject => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Experience (years)</label>
                  <input
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                  required
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit">Update Faculty</button>
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
              <h2>Delete Faculty Member</h2>
              <button
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete {selectedFaculty?.name}?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button onClick={handleDeleteFaculty} className="delete-btn">
                Delete Faculty
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
              <p>Are you sure you want to reset the password for {selectedFaculty?.name}?</p>
              <p>A password reset email will be sent to {selectedFaculty?.email}</p>
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

export default DepartmentFaculty; 
