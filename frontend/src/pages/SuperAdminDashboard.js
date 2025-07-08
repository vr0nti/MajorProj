// import React, { useState, useEffect } from 'react';
// import { Container, Card, Row, Col, Button } from 'react-bootstrap';
// import { motion } from 'framer-motion';
// import { useNavigate, Navigate } from 'react-router-dom';
// import useAuth from '../hooks/useAuth';
// import api from '../api/axios';
// import { handleError } from '../utils/toast';
// // import '../styles/super-admin-dashboard.css';

// export default function SuperAdminDashboard() {
//   const { user, loading: authLoading } = useAuth();
//   const navigate = useNavigate();
//   const [stats, setStats] = useState({});
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchStats();
//   }, []);

//   const fetchStats = async () => {
//     try {
//       const response = await api.get('/dashboard/stats');
//       setStats(response.data);
//     } catch (error) {
//       handleError(error, 'Failed to fetch dashboard statistics');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Show loading while auth is being checked
//   if (authLoading) {
//     return (
//       <div className="super-admin-dashboard-container">
//         <div className="super-admin-dashboard-header">
//           <h1 className="super-admin-dashboard-title">Super Admin Dashboard</h1>
//           <p className="super-admin-dashboard-subtitle">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   // Only Admin can access this page
//   if (!user || user.role !== 'admin') {
//     return <Navigate to="/dashboard" />;
//   }

//   const dashboardItems = [
//     {
//       title: 'Manage Department Admins',
//       description: 'Add, edit, and manage department administrators',
//       icon: '👥',
//       action: () => navigate('/super-admin/department-admins'),
//       variant: 'primary'
//     },
//     {
//       title: 'Manage Departments',
//       description: 'Add, edit, and manage departments',
//       icon: '🏢',
//       action: () => navigate('/super-admin/departments'),
//       variant: 'info'
//     },
//     {
//       title: 'View All Departments',
//       description: 'Overview of all departments and their admins',
//       icon: '📋',
//       action: () => navigate('/super-admin/departments-overview'),
//       variant: 'secondary'
//     },
//     {
//       title: 'System Overview',
//       description: 'View system statistics and analytics',
//       icon: '📊',
//       action: () => navigate('/super-admin/analytics'),
//       variant: 'success'
//     },
//     {
//       title: 'User Management',
//       description: 'Manage all users across departments',
//       icon: '👤',
//       action: () => navigate('/super-admin/users'),
//       variant: 'warning'
//     }
//   ];

//   return (
//     <div className="super-admin-dashboard-container">
     
      
//       <div className="super-admin-dashboard-header">
//         <Container>
//           <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
//             <Card className="mb-4">
//               <Card.Body>
//                 <h2>Super Admin Dashboard</h2>
//                 <p className="text-muted">Welcome back, {user?.name}!</p>
//                 <p>Manage the entire Digital Campus system from here.</p>
//               </Card.Body>
//             </Card>

//             <Row>
//               {dashboardItems.map((item, index) => (
//                 <Col key={index} md={6} lg={3} className="mb-4">
//                   <motion.div
//                     initial={{ opacity: 0, y: 20 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ delay: index * 0.1 }}
//                   >
//                     <Card 
//                       className="h-100 shadow-sm" 
//                       style={{ cursor: 'pointer' }}
//                       onClick={item.action}
//                     >
//                       <Card.Body className="text-center">
//                         <div className="mb-3" style={{ fontSize: '2rem' }}>
//                           {item.icon}
//                         </div>
//                         <Card.Title>{item.title}</Card.Title>
//                         <Card.Text className="text-muted">
//                           {item.description}
//                         </Card.Text>
//                         <Button variant={item.variant} size="sm">
//                           Access
//                         </Button>
//                       </Card.Body>
//                     </Card>
//                   </motion.div>
//                 </Col>
//               ))}
//             </Row>
//           </motion.div>
//         </Container>
//       </div>
//     </div>
//   );
// } 