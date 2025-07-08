import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import { handleError, handleSuccess } from '../utils/toast';
import '../styles/manage-departments.css';

export default function ManageDepartments() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
    description: '',
    status: 'active'
  });
  const [adminFormData, setAdminFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/department/all');
      console.log(response)
      setDepartments(response.data);
    } catch (error) {
      console.log(error)
      handleError(error, 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);
  
  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="manage-departments-container">
        <div className="manage-departments-header">
          <h1 className="manage-departments-title">Manage Departments</h1>
          <p className="manage-departments-subtitle">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Only Admin can access this page
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }


  const handleAddDepartment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/department/add', formData);
      handleSuccess('Department added successfully!');
      setShowAddModal(false);
      setFormData({ name: '', code: '', description: '', status: 'active' });
      fetchDepartments();
    } catch (error) {
      handleError(error, 'Failed to add department');
      setFormData({ name: '', code: '', description: '', status: 'active' });
    }
  };

  const handleEditDepartment = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/department/${selectedDepartment._id}`, formData);
      handleSuccess('Department updated successfully!');
      setShowEditModal(false);
      setSelectedDepartment(null);
      setFormData({ name: '', code: '', description: '', status: 'active' });
      fetchDepartments();
    } catch (error) {
      handleError(error, 'Failed to update department');
      setFormData({ name: '', code: '', description: '', status: 'active' });
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      await api.delete(`/departments/${selectedDepartment._id}`);
      handleSuccess('Department deleted successfully!');
      setShowDeleteModal(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (error) {
      handleError(error, 'Failed to delete department');
    }
  };

  const openEditModal = (department) => {
    setSelectedDepartment(department);
    setFormData({ name: department.name, code: department.code, description: department.description, status: department.status });
    setShowEditModal(true);
  };

  const openDeleteModal = (department) => {
    setSelectedDepartment(department);
    setShowDeleteModal(true);
  };

  const openAddAdminModal = (department) => {
    setSelectedDepartment(department);
    setAdminFormData({
      name: '',
      email: '',
      password: '',
      department: department._id
    });
    setShowAddAdminModal(true);
  };

  const handleAddDepartmentAdmin = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        ...adminFormData,
        role: 'departmentAdmin'
      };
      
      await api.post('/user', userData);
      handleSuccess('Department Admin added successfully!');
      setShowAddAdminModal(false);
      setAdminFormData({
        name: '',
        email: '',
        password: '',
        department: ''
      });
      fetchDepartments(); // Refresh to show updated admin count
    } catch (error) {
      handleError(error, 'Failed to add department admin');
    }
  };

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dept.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || dept.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: departments.length,
    active: departments.filter(dept => dept.status === 'active').length,
    inactive: departments.filter(dept => dept.status === 'inactive').length,
    totalClasses: departments.reduce((sum, dept) => sum + (dept.classes?.length || 0), 0),
    totalAdmins: departments.reduce((sum, dept) => sum + (dept.admins?.length || 0), 0)
  };

  if (loading) {
    return (
      <div className="manage-departments-container">
        <div className="manage-departments-header">
          <h1 className="manage-departments-title">Manage Departments</h1>
          <p className="manage-departments-subtitle">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-departments-container">
      <div className="manage-departments-header">
        <button 
          onClick={() => navigate('/super-admin/dashboard')} 
          className="back-btn"
        >
          Back to Dashboard
        </button>
        <h1 className="manage-departments-title">Manage Departments</h1>
        <p className="manage-departments-subtitle">View and manage all departments and their administrators</p>
      </div>

      {/* Statistics Cards */}
      <div className="manage-departments-stats">
        <div className="manage-departments-stat-card">
          <div className="manage-departments-stat-value">{stats.total}</div>
          <div className="manage-departments-stat-label">Total Departments</div>
        </div>
        <div className="manage-departments-stat-card">
          <div className="manage-departments-stat-value">{stats.active}</div>
          <div className="manage-departments-stat-label">Active Departments</div>
        </div>
        <div className="manage-departments-stat-card">
          <div className="manage-departments-stat-value">{stats.totalClasses}</div>
          <div className="manage-departments-stat-label">Total Classes</div>
        </div>
        <div className="manage-departments-stat-card">
          <div className="manage-departments-stat-value">{stats.totalAdmins}</div>
          <div className="manage-departments-stat-label">Total Admins</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="manage-departments-search">
        <input
          type="text"
          className="manage-departments-search-input"
          placeholder="Search departments by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="manage-departments-filters">
        <div className="manage-departments-filter-group">
          <label className="manage-departments-filter-label">Status Filter</label>
          <select
            className="manage-departments-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Departments</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="manage-departments-btn add"
        >
          Add New Department
        </button>
      </div>

      {/* Departments Table */}
      <div className="manage-departments-card">
        <div className="manage-departments-card-header">
          <h2 className="manage-departments-card-title">Departments List</h2>
        </div>
        <div className="manage-departments-card-body">
          {filteredDepartments.length === 0 ? (
            <div className="manage-departments-empty">
              <div className="manage-departments-empty-icon">🏢</div>
              <div className="manage-departments-empty-text">No departments found</div>
              <div className="manage-departments-empty-subtext">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Add your first department to get started'
                }
              </div>
            </div>
          ) : (
            <table className="manage-departments-table">
              <thead>
                <tr>
                  <th>Department Name</th>
                  <th>Code</th>
                  <th>Admins</th>
                  <th>Classes</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((department) => (
                  <tr key={department._id}>
                    <td>
                      <div>
                        <strong>{department.name}</strong>
                        {department.description && (
                          <div className="department-description">{department.description}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="department-code">{department.code}</span>
                    </td>
                    <td>
                      <span className={`manage-departments-status ${department.admins?.length > 0 ? 'active' : 'inactive'}`}>
                        {department.admins?.length > 0 ? `${department.admins.length} admin(s)` : 'No admins'}
                      </span>
                    </td>
                    <td>
                      <span className="manage-departments-status active">
                        {department.classes?.length || 0} classes
                      </span>
                    </td>
                    <td>
                      <span className={`manage-departments-status ${department.status}`}>
                        {department.status}
                      </span>
                    </td>
                    <td>
                      {new Date(department.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="manage-departments-actions">
                        <button
                          onClick={() => openAddAdminModal(department)}
                          className="manage-departments-btn edit"
                        >
                          Add Admin
                        </button>
                        <button
                          onClick={() => openEditModal(department)}
                          className="manage-departments-btn edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(department)}
                          className="manage-departments-btn delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Department</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddDepartment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Department Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter department name"
                    required
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Department Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Enter department code"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Department Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter department description"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="form-control"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Department</h3>
              <button 
                className="modal-close"
                onClick={() => {setFormData({ name: '', code: '', description: '', status: 'active' }); setShowEditModal(false)}}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditDepartment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Department Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter department name"
                    required
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Department Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Enter department code"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Department Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter department description"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="form-control"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {setFormData({ name: '', code: '', description: '', status: 'active' }); setShowEditModal(false)}}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Department Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Department</h3>
              <button 
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the department <strong>"{selectedDepartment?.name}"</strong>?</p>
              <p className="text-danger">
                <strong>Warning:</strong> This action cannot be undone. All associated data will be lost.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleDeleteDepartment}
              >
                Delete Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Admin Modal */}
      {showAddAdminModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>Add Department Admin - {selectedDepartment?.name}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAddAdminModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddDepartmentAdmin}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={adminFormData.name}
                    onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={adminFormData.email}
                    onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                    className="form-control"
                  />
                  <small className="form-text">
                    This will be the login email for the department admin.
                  </small>
                </div>
                
                <div className="form-group">
                  <label>Temporary Password *</label>
                  <input
                    type="password"
                    value={adminFormData.password}
                    onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                    placeholder="Enter temporary password"
                    required
                    minLength={6}
                    className="form-control"
                  />
                  <small className="form-text">
                    Department admin will be prompted to change this password on first login. Minimum 6 characters.
                  </small>
                </div>
                
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={selectedDepartment?.name || ''}
                    disabled
                    className="form-control bg-light"
                  />
                  <small className="form-text">
                    This admin will manage the {selectedDepartment?.name} department.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAddAdminModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Add Department Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 