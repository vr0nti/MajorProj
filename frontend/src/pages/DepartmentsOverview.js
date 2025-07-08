import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import { handleError } from '../utils/toast';
// import '../styles/departments-overview.css';

export default function DepartmentsOverview() {
  const { user, loading: authLoading } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
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
      <div className="departments-overview-container">
        <div className="departments-overview-header">
          <h1 className="departments-overview-title">Departments Overview</h1>
          <p className="departments-overview-subtitle">Loading...</p>
        </div>
      </div>
    );
  }

  // Only Admin can access this page
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <div className="departments-overview-container">
      <button 
        onClick={() => navigate('/super-admin/dashboard')} 
        className="back-btn"
      >
        Back to Super Admin Dashboard
      </button>
      
      <Container>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-4">
            <Card.Body>
              <h2>Departments Overview</h2>
              <p className="text-muted">View all departments and their statistics</p>
            </Card.Body>
          </Card>

          <Row>
            <Col>
              <Card>
                <Card.Body>
                  <h4>All Departments ({departments.length})</h4>
                  {departments.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted">No departments found.</p>
                    </div>
                  ) : (
                    <Table responsive striped hover>
                      <thead>
                        <tr>
                          <th>Department Name</th>
                          <th>Department Admins</th>
                          <th>Faculty Members</th>
                          <th>Students</th>
                          <th>Classes</th>
                          <th>Created Date</th>
                          <th>Last Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.map((dept) => (
                          <tr key={dept._id}>
                            <td>
                              <strong>{dept.name}</strong>
                            </td>
                            <td>
                              {dept.admins?.length > 0 ? (
                                <div>
                                  <Badge bg="primary" className="mb-1">{dept.admins.length} admin(s)</Badge>
                                  <div className="small text-muted">
                                    {dept.admins.map(admin => admin.name || admin.email).join(', ')}
                                  </div>
                                </div>
                              ) : (
                                <Badge bg="secondary">No admins assigned</Badge>
                              )}
                            </td>
                            <td>
                              <Badge bg="info">{dept.faculty?.length || 0} faculty</Badge>
                            </td>
                            <td>
                              <Badge bg="success">{dept.students?.length || 0} students</Badge>
                            </td>
                            <td>
                              <Badge bg="warning">{dept.classes?.length || 0} classes</Badge>
                            </td>
                            <td>
                              {new Date(dept.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              {new Date(dept.updatedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Summary Statistics */}
          <Row className="mt-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-primary">{departments.length}</h3>
                  <p className="text-muted">Total Departments</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-success">
                    {departments.reduce((sum, dept) => sum + (dept.admins?.length || 0), 0)}
                  </h3>
                  <p className="text-muted">Total Admins</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-info">
                    {departments.reduce((sum, dept) => sum + (dept.faculty?.length || 0), 0)}
                  </h3>
                  <p className="text-muted">Total Faculty</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <h3 className="text-warning">
                    {departments.reduce((sum, dept) => sum + (dept.students?.length || 0), 0)}
                  </h3>
                  <p className="text-muted">Total Students</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </motion.div>
      </Container>
    </div>
  );
} 