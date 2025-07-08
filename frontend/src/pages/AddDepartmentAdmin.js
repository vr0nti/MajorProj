import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Form, Button, Card, Spinner, Container, Row, Col, Alert } from 'react-bootstrap';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import { handleError, showToast } from '../utils/toast';
import api from '../api/axios';
// import '../styles/add-department-admin.css';

export default function AddDepartmentAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    department: '',
    phone: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchDepartments();
  }, []);
  
  const fetchDepartments = async () => {
    try {
      const response = await api.get('/department/all');
      setDepartments(response.data);
    } catch (error) {
      handleError(error, 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };
  
  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="add-department-admin-container">
        <div className="add-department-admin-header">
          <h1 className="add-department-admin-title">Add Department Admin</h1>
          <p className="add-department-admin-subtitle">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Only Super Admin can access this page
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const validateForm = () => {
    if (!form.name || !form.email || !form.password || !form.department) {
      showToast.error('Please fill in all required fields');
      return false;
    }
    
    if (form.password.length < 6) {
      showToast.error('Password must be at least 6 characters long');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      showToast.error('Please enter a valid email address');
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
        role: 'departmentAdmin',
        department: form.department,
        phone: form.phone,
        status: form.status
      };
      
      await api.post('/user', userData);
      showToast.success('Department Admin added successfully!');
      
      // Reset form
      setForm({ 
        name: '', 
        email: '', 
        password: '', 
        department: '',
        phone: '',
        status: 'active'
      });
    } catch (err) {
      handleError(err, 'Failed to add department admin');
    }
    setLoading(false);
  };

  return (
    <div className="add-department-admin-container">
      <button 
        onClick={() => navigate('/super-admin/dashboard')} 
        className="back-btn"
      >
        Back to Super Admin Dashboard
      </button>
      
      <div className="add-department-admin-header">
        <Container>
          <Row className="justify-content-center">
            <Col md={8} lg={6}>
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h3 className="mb-0">Add Department Admin</h3>
                    </div>
                    
                    <Alert variant="info">
                      <strong>Super Admin Panel:</strong> Add department administrators who will manage their respective departments.
                    </Alert>
                    
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-3" controlId="name">
                        <Form.Label>Full Name *</Form.Label>
                        <Form.Control 
                          name="name" 
                          value={form.name} 
                          onChange={handleChange} 
                          required 
                          placeholder="Enter full name"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="email">
                        <Form.Label>Email Address *</Form.Label>
                        <Form.Control 
                          type="email" 
                          name="email" 
                          value={form.email} 
                          onChange={handleChange} 
                          required 
                          placeholder="Enter email address"
                        />
                        <Form.Text className="text-muted">
                          This will be the login email for the department admin.
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="password">
                        <Form.Label>Temporary Password *</Form.Label>
                        <Form.Control 
                          type="password" 
                          name="password" 
                          value={form.password} 
                          onChange={handleChange} 
                          required 
                          placeholder="Enter temporary password"
                        />
                        <Form.Text className="text-muted">
                          Department admin will be prompted to change this password on first login. Minimum 6 characters.
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="department">
                        <Form.Label>Department *</Form.Label>
                        <Form.Select 
                          name="department" 
                          value={form.department} 
                          onChange={handleChange} 
                          required
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept._id} value={dept._id}>{dept.name}</option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          This department admin will manage this specific department.
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="phone">
                        <Form.Label>Phone</Form.Label>
                        <Form.Control 
                          type="tel" 
                          name="phone" 
                          value={form.phone} 
                          onChange={handleChange} 
                          placeholder="Enter phone number"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="status">
                        <Form.Label>Status</Form.Label>
                        <Form.Select 
                          name="status" 
                          value={form.status} 
                          onChange={handleChange} 
                          required
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </Form.Select>
                      </Form.Group>
                      
                      <div className="d-grid gap-2">
                        <Button type="submit" variant="primary" size="lg" disabled={loading}>
                          {loading ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Adding Department Admin...
                            </>
                          ) : (
                            'Add Department Admin'
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Card.Body>
                </Card>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
} 