import React from 'react';
import { Container, Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Departments() {
  const navigate = useNavigate();

  return (
    <div className="departments-container">
      <button 
        onClick={() => navigate('/dashboard')} 
        className="back-btn"
      >
        Back to Dashboard
      </button>
      
      <div className="departments-header">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <Card.Body>
              <h3>Departments</h3>
              <p>Department management features coming soon...</p>
            </Card.Body>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 