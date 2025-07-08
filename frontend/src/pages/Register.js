import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import '../styles/register.css';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import { handleError, showToast } from '../utils/toast';
import api from '../api/axios';

export default function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'student',
    department: '',
    class: '',
    section: ''
  });
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Load departments and classes for dropdowns
    const loadData = async () => {
      try {
        const [deptRes, classRes] = await Promise.all([
          api.get('/departments'),
          api.get('/classes')
        ]);
        setDepartments(deptRes.data);
        setClasses(classRes.data);
      } catch (error) {
        handleError(error, 'Failed to load departments and classes');
      }
    };
    loadData();
  }, []);

  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Reset class and section when role changes
    if (name === 'role') {
      setForm(prev => ({ 
        ...prev, 
        [name]: value,
        class: '',
        section: ''
      }));
    }
  };

  const validateForm = () => {
    if (!form.name || !form.email || !form.password || !form.department) {
      showToast.error('Please fill in all required fields');
      return false;
    }
    
    if (form.role === 'student' && (!form.class || !form.section)) {
      showToast.error('Please select class and section for students');
      return false;
    }
    
    if (form.password.length < 6) {
      showToast.error('Password must be at least 6 characters long');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const userData = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        department: form.department
      };
      
      // Add class and section for students
      if (form.role === 'student') {
        userData.class = form.class;
        userData.section = form.section;
      }
      
      await register(userData);
      showToast.success(`${form.role.charAt(0).toUpperCase() + form.role.slice(1)} added successfully!`);
      
      // Reset form
      setForm({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'student',
        department: '',
        class: '',
        section: ''
      });
    } catch (err) {
      handleError(err, 'Failed to add user');
    }
    setLoading(false);
  };

  return (
    <div className="register-container">
      <button 
        onClick={() => navigate('/')} 
        className="back-btn"
      >
        Back to Home
      </button>
      
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="register-card">
        <div className="register-card-header">
          <h3>Register</h3>
        </div>
        <div className="register-card-body">
          <form onSubmit={handleSubmit}>
            <div className="register-form-group">
              <label htmlFor="name" className="register-form-label">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                className="register-form-control"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Enter full name"
              />
            </div>
            <div className="register-form-group">
              <label htmlFor="email" className="register-form-label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="register-form-control"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="Enter email"
              />
            </div>
            <div className="register-form-group">
              <label htmlFor="password" className="register-form-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="register-form-control"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Enter password"
              />
            </div>
            <div className="register-form-group">
              <label className="register-form-label">Role</label>
              <div className="register-role-selector">
                <label className={`register-role-option${form.role === 'student' ? ' selected' : ''}`}>
                  <input type="radio" name="role" value="student" checked={form.role === 'student'} onChange={handleChange} />
                  <span className="register-role-label">Student</span>
                </label>
                <label className={`register-role-option${form.role === 'teacher' ? ' selected' : ''}`}>
                  <input type="radio" name="role" value="teacher" checked={form.role === 'teacher'} onChange={handleChange} />
                  <span className="register-role-label">Teacher</span>
                </label>
                <label className={`register-role-option${form.role === 'admin' ? ' selected' : ''}`}>
                  <input type="radio" name="role" value="admin" checked={form.role === 'admin'} onChange={handleChange} />
                  <span className="register-role-label">Admin</span>
                </label>
              </div>
            </div>
            <div className="register-form-group">
              <label htmlFor="department" className="register-form-label">Department</label>
              <select
                id="department"
                name="department"
                className="register-department-select"
                value={form.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            {form.role === 'student' && (
              <>
                <div className="register-form-group">
                  <label htmlFor="class" className="register-form-label">Class</label>
                  <select
                    id="class"
                    name="class"
                    className="register-class-select"
                    value={form.class}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls._id} value={cls._id}>
                        {cls.program} - {cls.specialization}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="register-form-group">
                  <label htmlFor="section" className="register-form-label">Section</label>
                  <input
                    id="section"
                    name="section"
                    type="text"
                    className="register-section-input"
                    value={form.section}
                    onChange={handleChange}
                    required
                    placeholder="Enter section (e.g., A, B, C)"
                  />
                </div>
              </>
            )}
            <button type="submit" className={`register-btn${loading ? ' loading' : ''}`} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm" /> : 'Register'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
} 