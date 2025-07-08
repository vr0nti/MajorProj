import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import useAuth from '../hooks/useAuth';
import '../styles/department-subjects.css';

const DepartmentSubjects = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterCredits, setFilterCredits] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    credits: '',
    semester: '',
    department: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subjectsRes, facultyRes] = await Promise.all([
        axios.get('/department-admin/subjects'),
        axios.get('/department-admin/faculty-list')
      ]);
      
      
      setSubjects(subjectsRes.data);
      setFaculty(facultyRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/department-admin/subjects', formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        code: '',
        description: '',
        credits: '',
        semester: '',
        department: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error adding subject:', error);
    }
  };

  const handleEditSubject = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/department-admin/subjects/${selectedSubject._id}`, formData);
      setShowEditModal(false);
      setSelectedSubject(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        credits: '',
        semester: '',
        department: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error updating subject:', error);
    }
  };

  const handleDeleteSubject = async () => {
    try {
      await axios.delete(`/department-admin/subjects/${selectedSubject._id}`);
      setShowDeleteModal(false);
      setSelectedSubject(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  };

  const openEditModal = (subject) => {
    setSelectedSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description,
      credits: subject.credits,
      semester: subject.semester,
      department: subject.department
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (subject) => {
    setSelectedSubject(subject);
    setShowDeleteModal(true);
  };

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.faculty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = !filterSemester || subject.semester === filterSemester;
    const matchesCredits = !filterCredits || parseFloat(subject.credits) === parseFloat(filterCredits);
    
    return matchesSearch && matchesSemester && matchesCredits;
  });

  const semesters = ['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'];

  if (loading) {
    return (
      <div className="subjects-container">
        <div className="loading">Loading subjects...</div>
      </div>
    );
  }

  return (
    <div className="subjects-container">
      <div className="subjects-header">
        <div className="header-content">
          <h1>Department Subjects</h1>
          <p>Manage subjects for {user.departmentName || (user.department?.name ?? user.department)}</p>
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
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filters">
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
            
            <input
              type="number"
              value={filterCredits}
              onChange={(e) => setFilterCredits(e.target.value)}
              placeholder="Filter by credits..."
              min="0"
              max="10"
              step="0.1"
            />
          </div>
        </div>
        
        <button
          className="add-btn"
          onClick={() => {setShowAddModal(true); setFormData({
            name: '',
            code: '',
            description: '',
            credits: '',
            semester: '',
            department: ''
          });}}
        >
          + Add New Subject
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>{subjects.length}</h3>
          <p>Total Subjects</p>
        </div>
        <div className="stat-card">
          <h3>{new Set(subjects.map(s => s.semester)).size}</h3>
          <p>Semesters Covered</p>
        </div>
        <div className="stat-card">
          <h3>{faculty.length}</h3>
          <p>Faculty Members</p>
        </div>
      </div>

      <div className="subjects-table">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Code</th>
              <th>Faculty</th>
              <th>Semester</th>
              <th>Credits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {console.log(filteredSubjects)}
            {filteredSubjects.map(subject => (
              <tr key={subject._id}>
                <td>
                  <div className="subject-info">
                    <h4>{subject.name}</h4>
                    {subject.description && <p>{subject.description}</p>}
                  </div>
                </td>
                <td>{subject.code}</td>
                <td>{subject.faculty.map(faculty => faculty.name).join(', ')}</td>
                <td>{subject.semester}</td>
                <td>{subject.credits} Credits</td>
                <td>
                  <div className="actions">
                    <button
                      className="edit-btn"
                      onClick={() => openEditModal(subject)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => openDeleteModal(subject)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredSubjects.length === 0 && (
          <div className="no-data">
            <p>No subjects found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Subject</h2>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddSubject}>
              <div className="form-row">
                <div className="form-group">
                  <label>Subject Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Subject Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  placeholder="Brief description of the subject..."
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({...formData, semester: e.target.value})}
                    required
                  >
                    <option value="">Select Semester</option>
                    {semesters.map(semester => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Credits</label>
                  <input
                    type="number"
                    value={formData.credits}
                    onChange={(e) => setFormData({...formData, credits: e.target.value})}
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="e.g., 3.5"
                    required
                  />
                </div>
              </div>
              
              
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Subject</h2>
              <button
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubject}>
              <div className="form-row">
                <div className="form-group">
                  <label>Subject Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Subject Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  placeholder="Brief description of the subject..."
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({...formData, semester: e.target.value})}
                    required
                  >
                    <option value="">Select Semester</option>
                    {semesters.map(semester => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Credits</label>
                  <input
                    type="number"
                    value={formData.credits}
                    onChange={(e) => setFormData({...formData, credits: e.target.value})}
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="e.g., 3.5"
                    required
                  />
                </div>
              </div>
              
              
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit">Update Subject</button>
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
              <h2>Delete Subject</h2>
              <button
                className="close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete the subject "{selectedSubject?.name}"?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button onClick={handleDeleteSubject} className="delete-btn">
                Delete Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentSubjects; 
