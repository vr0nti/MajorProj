import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="profile-container">
      <button 
        onClick={() => navigate('/dashboard')} 
        className="back-btn"
      >
        Back to Dashboard
      </button>
      <div className="profile-header">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <Card.Body>
              <h3>Profile</h3>
              <div className="profile-details">
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                {user.department && <p><strong>Department:</strong> {user.department.name || user.department}</p>}
                {user.class && <p><strong>Class:</strong> {user.class.fullName || user.class}</p>}
                {user.role === 'faculty' && (
                  <>
                    <p><strong>Is Class Teacher:</strong> {user.isClassTeacher ? 'Yes' : 'No'}</p>
                    {user.subjects && user.subjects.length > 0 && (
                      <p><strong>Subjects:</strong> {user.subjects.map(s => s.name).join(', ')}</p>
                    )}
                  </>
                )}
                {user.role === 'student' && (
                  <>
                    {user.rollNumber && <p><strong>Roll Number:</strong> {user.rollNumber}</p>}
                    {user.semester && <p><strong>Semester:</strong> {user.semester}</p>}
                    {user.parentName && <p><strong>Parent Name:</strong> {user.parentName}</p>}
                    {user.parentPhone && <p><strong>Parent Phone:</strong> {user.parentPhone}</p>}
                  </>
                )}
              </div>
              <Button variant="primary" onClick={() => navigate('/change-password')} style={{ marginTop: 16 }}>
                Change Password
              </Button>
            </Card.Body>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 