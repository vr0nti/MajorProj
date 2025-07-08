import React, { useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './styles/app.css';
import './styles/index.css';
import './styles/components.css';
import './styles/layout.css';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddDepartmentAdmin from './pages/AddDepartmentAdmin';
import ManageDepartments from './pages/ManageDepartments';
import DepartmentsOverview from './pages/DepartmentsOverview';
import Attendance from './pages/Attendance';
import Classes from './pages/Classes';
import Complaints from './pages/Complaints';
import Departments from './pages/Departments';
import Timetable from './pages/Timetable';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import ProtectedRoute from './components/ProtectedRoute';
import { handleError } from './utils/toast';
import useAuth from './hooks/useAuth';
import ManageDepartmentAdmins from './pages/ManageDepartmentAdmins';
import DepartmentClasses from './pages/DepartmentClasses';
import DepartmentFaculty from './pages/DepartmentFaculty';
import DepartmentSubjects from './pages/DepartmentSubjects';
import DepartmentStudents from './pages/DepartmentStudents';
import DepartmentAdminGrades from './pages/DepartmentAdminGrades'
import FacultyGrades from './pages/FacultyGrades';
import Grades from './pages/Grades';

// Enhanced pages
import NoticeBoard from './pages/NoticeBoard';
import ChatInterface from './pages/ChatInterface';

// Page placeholders
const Home = () => <h2>Welcome to Digital Campus</h2>;

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    handleError(error, 'Something went wrong. Please refresh the page.');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h3>Something went wrong.</h3>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component to handle first login redirect
function FirstLoginRedirect({ children }) {
  const { user, needsPasswordChange } = useAuth();
  
  if (user && needsPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }
  
  return children;
}

// Navigation component with role-based styling
function Navigation({ user, logout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const getNavbarClass = () => {
    if (!user) return 'navbar';
    switch (user.role) {
      case 'admin':
        return 'navbar navbar-admin';
      case 'teacher':
        return 'navbar navbar-teacher';
      case 'student':
        return 'navbar navbar-student';
      default:
        return 'navbar';
    }
  };

  const isActive = (path) => location.pathname === path;

  // Role-based dashboard navigation
  const handleLogoClick = () => {
    if (!user) {
      navigate('/');
    }
    else{
      navigate('/dashboard');

    }
    
    setIsMenuOpen(false);
  };

  return (
    <nav className={getNavbarClass()}>
      <div className="navbar-container">
        <span className="navbar-brand" style={{ cursor: 'pointer' }} onClick={handleLogoClick}>
          Digital Campus
        </span>
        
        <button 
          className="navbar-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        
        <div className={`navbar-collapse${isMenuOpen ? ' show' : ''}`}>
          <ul className="navbar-nav">
            {user ? (
              <>
                {user.role === 'admin' || user.role === 'departmentAdmin' ? (
                  <>
                    {user.role === 'admin' ? (
                      <>
                        <li className="navbar-nav-right">
                          <Link 
                            to="/profile" 
                            className="nav-link"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {user.name}
                          </Link>
                        </li>
                        <li className="navbar-nav-right">
                          <button 
                            onClick={() => {
                              logout();
                              setIsMenuOpen(false);
                            }}
                            className="nav-link logout-btn"
                          >
                            Logout
                          </button>
                        </li>
                      </>
                    ) : user.role === 'departmentAdmin' ? (
                      <>
                        
                        <li className="navbar-nav-right">
                          <Link 
                            to="/profile" 
                            className="nav-link"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {user.name}
                          </Link>
                        </li>
                        <li className="navbar-nav-right">
                          <button 
                            onClick={() => {
                              logout();
                              setIsMenuOpen(false);
                            }}
                            className="nav-link logout-btn"
                          >
                            Logout
                          </button>
                        </li>
                      </>
                    ) : (
                     <>
                     <li className="navbar-nav-right">
                      <Link 
                        to="/profile" 
                        className="nav-link"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {user.name}
                      </Link>
                    </li>
                    <li className="navbar-nav-right">
                      <button 
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                        className="nav-link logout-btn"
                      >
                        Logout
                      </button>
                    </li>
                     </>
                    )}
                  </>
                ) : (
                  <>
                    <li className="navbar-nav-right">
                      <Link 
                        to="/profile" 
                        className="nav-link"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {user.name}
                      </Link>
                    </li>
                    <li className="navbar-nav-right">
                      <button 
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                        className="nav-link logout-btn"
                      >
                        Logout
                      </button>
                    </li>
                  </>
                )}
              </>
            ) : (
              <>
                <li className="navbar-nav-right">
                  <Link 
                    to="/login" 
                    className="nav-link"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                </li>
              
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

function App() {
  const { user, logout } = useAuth();

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Navigation user={user} logout={logout} />
        <main className="main-content">
          <div className="main-container">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<PageWrapper><Login /></PageWrapper>} />
                <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
                <Route path="/register" element={<ProtectedRoute roles={['admin']}><PageWrapper><Register /></PageWrapper></ProtectedRoute>} />
                <Route path="/change-password" element={<ProtectedRoute><PageWrapper><ChangePassword /></PageWrapper></ProtectedRoute>} />
                
                {/* Super Admin Routes (Admin role) */}
                <Route path="/super-admin/dashboard" element={
                  <ProtectedRoute roles={['admin']}>
                    <FirstLoginRedirect>
                      <PageWrapper><Dashboard /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                <Route path="/super-admin/department-admins" element={<ProtectedRoute allowedRoles={['superAdmin']}><ManageDepartmentAdmins /></ProtectedRoute>} />
                <Route path="/super-admin/add-department-admin" element={
                  <ProtectedRoute roles={['admin']}>
                    <FirstLoginRedirect>
                      <PageWrapper><AddDepartmentAdmin /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                <Route path="/super-admin/departments" element={<ManageDepartments />} />
                <Route path="/super-admin/departments-overview" element={
                  <ProtectedRoute roles={['admin']}>
                    <FirstLoginRedirect>
                      <PageWrapper><DepartmentsOverview /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                
                {/* Regular Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <FirstLoginRedirect>
                      <PageWrapper><Dashboard /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                <Route path="/attendance" element={
                  <ProtectedRoute>
                    <FirstLoginRedirect>
                      <PageWrapper><Attendance /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                <Route path="/classes" element={
                  <ProtectedRoute>
                    <FirstLoginRedirect>
                      <PageWrapper><Classes /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                <Route path="/complaints" element={
                  <ProtectedRoute>
                    <FirstLoginRedirect>
                      <PageWrapper><Complaints /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                <Route path="/departments" element={
                  <ProtectedRoute>
                    <FirstLoginRedirect>
                      <PageWrapper><Departments /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
               
                <Route path="/notice-board" element={
                  <ProtectedRoute>
                    <FirstLoginRedirect>
                      <PageWrapper><NoticeBoard /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                <Route path="/timetable" element={
                  <ProtectedRoute>
                    <FirstLoginRedirect>
                      <PageWrapper><Timetable /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
               
                <Route path="/chat" element={
                  <ProtectedRoute>
                    <FirstLoginRedirect>
                      <PageWrapper><Chat /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                <Route path="/chat-interface" element={
                  <ProtectedRoute>
                    <FirstLoginRedirect>
                      <PageWrapper><ChatInterface /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                <Route path="/grades" element={
                  <ProtectedRoute>
                    <FirstLoginRedirect>
                      <PageWrapper><Grades /></PageWrapper>
                    </FirstLoginRedirect>
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                
                {/* Department Admin Routes */}
                <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['departmentAdmin']}><Dashboard /></ProtectedRoute>} />
                <Route path="/department-admin/classes" element={<ProtectedRoute allowedRoles={['departmentAdmin']}><DepartmentClasses /></ProtectedRoute>} />
                <Route path="/department-admin/faculty" element={<ProtectedRoute allowedRoles={['departmentAdmin']}><DepartmentFaculty /></ProtectedRoute>} />
                <Route path="/department-admin/subjects" element={<ProtectedRoute allowedRoles={['departmentAdmin']}><DepartmentSubjects /></ProtectedRoute>} />
                <Route path="/department-admin/students" element={<ProtectedRoute allowedRoles={['departmentAdmin']}><DepartmentStudents /></ProtectedRoute>} />
                <Route path="/department-admin/grades" element={<ProtectedRoute allowedRoles={['departmentAdmin']}><DepartmentAdminGrades /></ProtectedRoute>} />
                
                { /* Faculty Routes*/}
                <Route path="/faculty/grades" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyGrades /></ProtectedRoute>} />


              </Routes>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

function PageWrapper({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

export default App;
