import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import { handleError, handleSuccess } from '../utils/toast';
import '../styles/manage-department-admins.css';

export default function ManageDepartmentAdmins() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    password: ''
  });

  const fetchData = async () => {
    try {
      const [adminsResponse, departmentsResponse] = await Promise.all([
        api.get('/user/department-admins'),
        api.get('/department/all')
      ]);
      
      setAdmins(adminsResponse.data);
      setDepartments(departmentsResponse.data);
    } catch (error) {
      handleError(error, 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="manage-department-admins-container">
        <div className="manage-department-admins-header">
          <h1 className="manage-department-admins-title">Manage Department Admins</h1>
          <p className="manage-department-admins-subtitle">Loading...</p>
        </div>
      </div>
    );
  }

  // Only Admin can access this page
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        ...formData,
        role: 'departmentAdmin'
      };
      
      await api.post('/user', userData);
      handleSuccess('Department Admin added successfully!');
      setShowAddModal(false);
      setFormData({ name: '', email: '', department: '', password: '' });
      fetchData();
    } catch (error) {
      handleError(error, 'Failed to add department admin');
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/user/${selectedAdmin._id}`, {
        name: formData.name,
        email: formData.email,
        department: formData.department
      });
      
      handleSuccess('Department Admin updated successfully!');
      setShowEditModal(false);
      setSelectedAdmin(null);
      setFormData({ name: '', email: '', department: '', password: '' });
      fetchData();
    } catch (error) {
      handleError(error, 'Failed to update department admin');
    }
  };

  const handleDeleteAdmin = async () => {
    try {
      await api.delete(`/user/${selectedAdmin._id}`);
      handleSuccess('Department Admin deleted successfully!');
      setShowDeleteModal(false);
      setSelectedAdmin(null);
      fetchData();
    } catch (error) {
      handleError(error, 'Failed to delete department admin');
    }
  };

  const handleResetPassword = async () => {
    try {
      await api.post(`/user/${selectedAdmin._id}/reset-password`, {
        newPassword: formData.password
      });
      
      handleSuccess('Password reset successfully!');
      setShowResetModal(false);
      setSelectedAdmin(null);
      setFormData({ name: '', email: '', department: '', password: '' });
    } catch (error) {
      handleError(error, 'Failed to reset password');
    }
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      department: admin.department?._id || '',
      password: ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (admin) => {
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  const openResetModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({ name: '', email: '', department: '', password: '' });
    setShowResetModal(true);
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || admin.department?._id === filterDepartment;
    const matchesStatus = filterStatus === 'all' || admin.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const stats = {
    total: admins.length,
    active: admins.filter(admin => admin.status === 'active').length,
    inactive: admins.filter(admin => admin.status === 'inactive').length,
    pending: admins.filter(admin => admin.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="manage-department-admins-container">
        <div className="manage-department-admins-header">
          <h1 className="manage-department-admins-title">Manage Department Admins</h1>
          <p className="manage-department-admins-subtitle">Loading department admins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-department-admins-container">
      <div className="manage-department-admins-header">
        <button 
          onClick={() => navigate('/super-admin/dashboard')} 
          className="back-btn"
        >
          Back to Super Admin Dashboard
        </button>
        <h1 className="manage-department-admins-title">Manage Department Admins</h1>
        <p className="manage-department-admins-subtitle">Add, edit, and manage department administrators</p>
      </div>

      {/* Statistics Cards */}
      <div className="manage-department-admins-stats">
        <div className="manage-department-admins-stat-card">
          <div className="manage-department-admins-stat-value">{stats.total}</div>
          <div className="manage-department-admins-stat-label">Total Admins</div>
        </div>
        <div className="manage-department-admins-stat-card">
          <div className="manage-department-admins-stat-value">{stats.active}</div>
          <div className="manage-department-admins-stat-label">Active Admins</div>
        </div>
        <div className="manage-department-admins-stat-card">
          <div className="manage-department-admins-stat-value">{stats.inactive}</div>
          <div className="manage-department-admins-stat-label">Inactive Admins</div>
        </div>
        <div className="manage-department-admins-stat-card">
          <div className="manage-department-admins-stat-value">{stats.pending}</div>
          <div className="manage-department-admins-stat-label">Pending Admins</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="manage-department-admins-search">
        <input
          type="text"
          className="manage-department-admins-search-input"
          placeholder="Search admins by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="manage-department-admins-filters">
        <div className="manage-department-admins-filter-group">
          <label className="manage-department-admins-filter-label">Department Filter</label>
          <select
            className="manage-department-admins-filter-select"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        <div className="manage-department-admins-filter-group">
          <label className="manage-department-admins-filter-label">Status Filter</label>
          <select
            className="manage-department-admins-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="manage-department-admins-btn add"
        >
          Add New Admin
        </button>
      </div>

      {/* Admins Table */}
      <div className="manage-department-admins-card">
        <div className="manage-department-admins-card-header">
          <h2 className="manage-department-admins-card-title">Department Admins List</h2>
        </div>
        <div className="manage-department-admins-card-body">
          {filteredAdmins.length === 0 ? (
            <div className="manage-department-admins-empty">
              <div className="manage-department-admins-empty-icon">👥</div>
              <div className="manage-department-admins-empty-text">No department admins found</div>
              <div className="manage-department-admins-empty-subtext">
                {searchTerm || filterDepartment !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters' 
                  : 'Add your first department admin to get started'
                }
              </div>
            </div>
          ) : (
            <table className="manage-department-admins-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => (
                  <tr key={admin._id}>
                    <td>
                      <div className="manage-department-admins-user-info">
                        <div className="manage-department-admins-avatar">
                          {getInitials(admin.name)}
                        </div>
                        <div className="manage-department-admins-user-details">
                          <div className="manage-department-admins-user-name">{admin.name}</div>
                          <div className="manage-department-admins-user-email">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{admin.email}</td>
                    <td>
                      {admin.department ? (
                        <span className="manage-department-admins-department-badge">
                          {admin.department.name}
                        </span>
                      ) : (
                        <span className="manage-department-admins-status inactive">No Department</span>
                      )}
                    </td>
                    <td>
                      <span className={`manage-department-admins-status ${admin.status || 'inactive'}`}>
                        {admin.status || 'inactive'}
                      </span>
                    </td>
                    <td>
                      {admin.lastLogin 
                        ? new Date(admin.lastLogin).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td>
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="manage-department-admins-actions">
                        <button
                          onClick={() => openEditModal(admin)}
                          className="manage-department-admins-btn edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openResetModal(admin)}
                          className="manage-department-admins-btn reset"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => openDeleteModal(admin)}
                          className="manage-department-admins-btn delete"
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

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>Add New Department Admin</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddAdmin}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                    className="form-control"
                  />
                  <small className="form-text">
                    This will be the login email for the department admin.
                  </small>
                </div>
                
                <div className="form-group">
                  <label>Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    className="form-control"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Temporary Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter temporary password"
                    required
                    minLength={6}
                    className="form-control"
                  />
                  <small className="form-text">
                    Department admin will be prompted to change this password on first login. Minimum 6 characters.
                  </small>
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
                <button type="submit" className="btn btn-success">
                  Add Department Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>Edit Department Admin</h3>
              <button 
                className="modal-close"
                onClick={() => {setFormData({ name: '', email: '', department: '', password: '' }); setShowEditModal(false)}}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditAdmin}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    className="form-control"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {setFormData({ name: '', email: '', department: '', password: '' }); setShowEditModal(false)}}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Department Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Admin Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Department Admin</h3>
              <button 
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the department admin <strong>"{selectedAdmin?.name}"</strong>?</p>
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
                onClick={handleDeleteAdmin}
              >
                Delete Department Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Password - {selectedAdmin?.name}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowResetModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                    className="form-control"
                  />
                  <small className="form-text">
                    Minimum 6 characters. The admin will be notified of this password change.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowResetModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 