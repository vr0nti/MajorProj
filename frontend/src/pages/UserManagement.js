import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import '../styles/user-management.css';
import { Card } from 'react-bootstrap';

export default function UserManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [filterRole, setFilterRole] = useState('');

  // Get user's department if they are a department admin
  const userDepartment = user?.department;

  // Fetch data when component loads or when the authenticated user changes (e.g., on role switch)
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch data based on user role
      let departmentsRes, classesRes, usersRes;

      if (user?.role === 'departmentAdmin') {
        // Department admin: only fetch their department's data
        [departmentsRes, classesRes, usersRes] = await Promise.all([
          api.get(`/department/${userDepartment}`),
          api.get(`/class/all?departmentId=${userDepartment}`),
          api.get(`/user/department/${userDepartment}`)
        ]);
        // Convert single department to array for consistency
        setDepartments([departmentsRes.data]);
      } else {
        // Super admin: fetch all data (view-only)
        [departmentsRes, classesRes, usersRes] = await Promise.all([
          api.get('/department/all'),
          api.get('/class/all'),
          api.get('/user/all')
        ]);
        setDepartments(departmentsRes.data);
      }

      setClasses(classesRes.data);
      setAllUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(usr => {
    const userDept = usr.department?._id || usr.department;
    const matchesDepartment = !selectedDepartment || userDept === selectedDepartment;
    const matchesRole = !filterRole || usr.role === filterRole;
    return matchesDepartment && matchesRole;
  });

  if (loading) {
    return (
      <div className="user-management-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      <button
        onClick={() => navigate('/dashboard')}
        className="back-btn"
      >
        Back to Dashboard
      </button>

      <div className="user-management-header">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="header-content"
        >
          <h1>User Management</h1>
          <p>
            {user?.role === 'admin'
              ? 'View all users across the system (View-only access)'
              : 'Manage users in your department'
            }
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Filter by Department:</label>
          <select
            value={selectedDepartment || ''}
            onChange={(e) => setSelectedDepartment(e.target.value || null)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Filter by Role:</label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="departmentAdmin">Department Admin</option>
            {user?.role === 'admin' && <option value="admin">Super Admin</option>}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-section">
        <div className="stat-card total">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{filteredUsers.length}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="stat-card student">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <h3>{filteredUsers.filter(u => u.role === 'student').length}</h3>
            <p>Students</p>
          </div>
        </div>
        <div className="stat-card faculty">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <h3>{filteredUsers.filter(u => u.role === 'faculty').length}</h3>
            <p>Faculty</p>
          </div>
        </div>
        <div className="stat-card dept-admin">
          <div className="stat-icon">🧑‍💼</div>
          <div className="stat-content">
            <h3>{filteredUsers.filter(u => u.role === 'departmentAdmin').length}</h3>
            <p>Department Admins</p>
          </div>
        </div>
        <div className="stat-card admin">
          <div className="stat-icon">🛡️</div>
          <div className="stat-content">
            <h3>{filteredUsers.filter(u => u.role === 'admin').length}</h3>
            <p>Admins</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Class</th>
              <th>Status</th>
              {user?.role === 'departmentAdmin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((usr) => (
              <tr key={usr._id}>
                <td>{usr.name}</td>
                <td>{usr.email}</td>
                <td>
                  <span className={`role-badge role-${usr.role}`}>
                    {usr.role}
                  </span>
                </td>
                <td>{usr.department?.name || 'N/A'}</td>
                <td>{usr.class?.name || 'N/A'}</td>
                <td>
                  <span className={`status-badge status-${usr.status || 'active'}`}>
                    {usr.status || 'active'}
                  </span>
                </td>
                {user?.role === 'departmentAdmin' && (
                  <td>
                    <div className="actions">
                      <button className="edit-btn">Edit</button>
                      <button className="delete-btn">Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="no-data">
            <p>No users found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Admin Notice */}
      {user?.role === 'admin' && (
        <div className="admin-notice">
          <Card>
            <Card.Body>
              <h5>View-Only Access</h5>
              <p>
                As a Super Admin, you have view-only access to all user data.
                Department admins are responsible for creating and managing users within their departments.
              </p>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
} 
