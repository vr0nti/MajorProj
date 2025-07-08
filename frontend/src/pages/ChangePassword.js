import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Card, Spinner, Container, Row, Col, Alert } from 'react-bootstrap';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import { handleError, showToast } from '../utils/toast';
import api from '../api/axios';

export default function ChangePassword() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!form.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (form.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
        id: user.id
      });
      
      showToast.success('Password changed successfully!');
      // Update the user state
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Redirect to dashboard after successful password change
      navigate('/dashboard');
    } catch (err) {
      handleError(err, 'Failed to change password');
    }
    setLoading(false);
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="change-password-container">
      <button 
        onClick={() => navigate('/dashboard')} 
        className="back-btn"
      >
        Back to Dashboard
      </button>
      
      <div className="change-password-header">
        <Container>
          <Row className="justify-content-center">
            <Col md={6} lg={4}>
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <Card.Body>
                    <h3 className="mb-4 text-center">
                        Change Your Password
                    </h3>
                    
                   
                      <Alert variant="warning">
                        <strong>Welcome {user?.name}!</strong> Please change your password for security.
                      </Alert>
                   
                    
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-3" controlId="currentPassword">
                        <Form.Label>Current Password</Form.Label>
                        <Form.Control 
                          type="password" 
                          name="currentPassword"
                          value={form.currentPassword} 
                          onChange={handleChange}
                          isInvalid={!!errors.currentPassword}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.currentPassword}
                        </Form.Control.Feedback>
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="newPassword">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control 
                          type="password" 
                          name="newPassword"
                          value={form.newPassword} 
                          onChange={handleChange}
                          isInvalid={!!errors.newPassword}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.newPassword}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          Password must be at least 6 characters long.
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="confirmPassword">
                        <Form.Label>Confirm New Password</Form.Label>
                        <Form.Control 
                          type="password" 
                          name="confirmPassword"
                          value={form.confirmPassword} 
                          onChange={handleChange}
                          isInvalid={!!errors.confirmPassword}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.confirmPassword}
                        </Form.Control.Feedback>
                      </Form.Group>
                      
                      <div className="d-grid">
                        <Button 
                          variant="primary" 
                          type="submit" 
                          disabled={loading}
                          className="w-100"
                        >
                          {loading ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Changing Password...
                            </>
                          ) : (
                            'Change Password'
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