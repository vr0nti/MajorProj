import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import '../styles/user-management.css';
import { Card } from 'react-bootstrap';

// Temporary passwords from environment variables
const STUDENT_TEMP_PASSWORD = process.env.REACT_APP_STUDENT_TEMP_PASSWORD || 'Student@123';
const FACULTY_TEMP_PASSWORD = process.env.REACT_APP_FACULTY_TEMP_PASSWORD || 'Faculty@123';
const DEPARTMENT_ADMIN_TEMP_PASSWORD = process.env.REACT_APP_DEPARTMENT_ADMIN_TEMP_PASSWORD || 'Admin@123';

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch data based on user role
      let departmentsRes, classesRes, usersRes;
      
      if (user?.role === 'departmentAdmin') {
        // Department admin: only fetch their department's data
        [departmentsRes, classesRes, usersRes] = await Promise.all([
          api.get(`/departments/${userDepartment}`),
          api.get(`/classes/all?departmentId=${userDepartment}`),
          api.get(`/user/department/${userDepartment}`)
        ]);
        // Convert single department to array for consistency
        setDepartments([departmentsRes.data]);
      } else {
        // Super admin: fetch all data (view-only)
        [departmentsRes, classesRes, usersRes] = await Promise.all([
          api.get('/departments/all'),
          api.get('/classes/all'),
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

  const getClassesByDepartment = (departmentId) => {
    return classes.filter(cls => cls.department === departmentId);
  };

  const filteredUsers = allUsers.filter(user => {
    const matchesDepartment = !selectedDepartment || user.department === selectedDepartment;
    const matchesRole = !filterRole || user.role === filterRole;
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
        ← Back to Dashboard
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
        <div className="stat-card">
          <h3>{filteredUsers.length}</h3>
          <p>Total Users</p>
        </div>
        <div className="stat-card">
          <h3>{filteredUsers.filter(u => u.role === 'student').length}</h3>
          <p>Students</p>
        </div>
        <div className="stat-card">
          <h3>{filteredUsers.filter(u => u.role === 'faculty').length}</h3>
          <p>Faculty</p>
        </div>
        <div className="stat-card">
          <h3>{filteredUsers.filter(u => u.role === 'departmentAdmin').length}</h3>
          <p>Department Admins</p>
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
            {filteredUsers.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.department?.name || 'N/A'}</td>
                <td>{user.class?.name || 'N/A'}</td>
                <td>
                  <span className={`status-badge status-${user.status || 'active'}`}>
                    {user.status || 'active'}
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