import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import '../styles/dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [quickActions, setQuickActions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);
  

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, activitiesResponse, eventsResponse] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-activities'),
        api.get('/dashboard/upcoming-events')
      ]);

      setStats(statsResponse.data);
      setRecentActivities(activitiesResponse.data);
      setUpcomingEvents(eventsResponse.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      setLoading(false);
    }
  };

  const getRoleBasedQuickActions = () => {
    switch (user.role) {
      case 'admin':
        return [
          // { title: 'Add Department Admin', path: '/super-admin/add-department-admin', icon: '👥' },
          { title: 'Manage Departments', path: '/super-admin/departments', icon: '🏢' },
          { title: 'View All Users', path: '/user-management', icon: '👤' },
          { title: 'System Analytics', path: '/analytics', icon: '📊' },
          { title: 'Notices', path: '/notice-board', icon: '📢' },
          { title: 'Complaints', path: '/complaints', icon: '📝' },
        ];
      case 'departmentAdmin':
        return [
          { title: 'Manage Classes', path: '/department-admin/classes', icon: '📚' },
          { title: 'Manage Subjects', path: '/department-admin/subjects', icon: '📖' },
          { title: 'Manage Faculty', path: '/department-admin/faculty', icon: '👨‍🏫' },
          { title: 'Manage Students', path: '/department-admin/students', icon: '👨‍🎓' },
          { title: 'Manage Grades', path: '/department-admin/grades', icon: '📝' },
          { title: 'Notices', path: '/notice-board', icon: '📢' },
          { title: 'Complaints', path: '/complaints', icon: '📝' },
        ];
      case 'faculty':
        return [
          { title: 'Take Attendance', path: '/attendance', icon: '✅' },
          { title: 'Manage Grades', path: '/faculty/grades', icon: '📝' },
          { title: 'View Timetable', path: '/timetable', icon: '📅' },
          { title: 'View Notices', path: '/notice-board', icon: '📢' },
          { title: 'Complaints', path: '/complaints', icon: '📝' },
        ];
      case 'student':
        return [
          { title: 'View Attendance', path: '/attendance', icon: '✅' },
          { title: 'View Grades', path: '/grades', icon: '📝' },
          { title: 'View Timetable', path: '/timetable', icon: '📅' },
          { title: 'View Notices', path: '/notice-board', icon: '📢' },
          { title: 'Submit Complaint', path: '/complaints', icon: '📝' },
        ];
      default:
        return [];
    }
  };

  const getRoleBasedStats = () => {
    switch (user.role) {
      case 'admin':
        return [
          { title: 'Total Departments', value: stats.totalDepartments || 0, icon: '🏢', color: '#007bff' },
          { title: 'Total Users', value: stats.totalUsers || 0, icon: '👥', color: '#28a745' },
          { title: 'Active Complaints', value: stats.activeComplaints || 0, icon: '📝', color: '#ffc107' },
          { title: 'Published Notices', value: stats.publishedNotices || 0, icon: '📢', color: '#dc3545' }
        ];
      case 'departmentAdmin':
        return [
          { title: 'Department Classes', value: stats.departmentClasses || 0, icon: '📚', color: '#ffc107' },
          { title: 'Department Subjects', value: stats.departmentSubjects || 0, icon: '📖', color: '#dc3545' },
          { title: 'Department Faculty', value: stats.departmentFaculty || 0, icon: '👨‍🏫', color: '#007bff' },
          { title: 'Department Students', value: stats.departmentStudents || 0, icon: '👨‍🎓', color: '#28a745' }
        ];
      case 'faculty':
        return [
          { title: 'My Classes', value: stats.myClasses || 0, icon: '📚', color: '#007bff' },
          { title: 'My Students', value: stats.myStudents || 0, icon: '👨‍🎓', color: '#28a745' },
          { title: 'Attendance Rate', value: `${stats.attendanceRate || 0}%`, icon: '✅', color: '#ffc107' },
          { title: 'Pending Grades', value: stats.pendingGrades || 0, icon: '📝', color: '#dc3545' }
        ];
      case 'student':
        return [
          { title: 'My Attendance', value: `${stats.myAttendance || 0}%`, icon: '✅', color: '#007bff' },
          { title: 'My Classes', value: stats.myClasses || 0, icon: '📚', color: '#28a745' },
          { title: 'My Subjects', value: stats.mySubjects || 0, icon: '📖', color: '#ffc107' },
          { title: 'My Grades', value: stats.myGrades || 0, icon: '📝', color: '#dc3545' }
        ];
      default:
        return [];
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome back, {user.name}!</h1>
        <p>Here's what's happening in your Digital Campus</p>
      </div>

      {/* {error && <div className="error-message">{error}</div>} */}

      {/* Stats Cards */}
      <div className="stats-section">
        <h2>Overview</h2>
        <div className="stats-grid">
          {getRoleBasedStats().map((stat, index) => (
            <div key={index} className="stat-card" style={{ borderLeftColor: stat.color }}>
              <div className="stat-icon" style={{ backgroundColor: stat.color }}>
                {stat.icon}
              </div>
              <div className="stat-content">
                <h3>{stat.value}</h3>
                <p>{stat.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>All Features</h2>
        <p className="dashboard-note">All your functionalities are accessible from here.</p>
        <div className="quick-actions-grid">
          {getRoleBasedQuickActions().map((action, index) => (
            <a key={index} href={action.path} className="quick-action-card">
              <div className="action-icon">{action.icon}</div>
              <h3>{action.title}</h3>
            </a>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        {/* Recent Activities */}
        <div className="activities-section">
          <h2>Recent Activities</h2>
          <div className="activities-list">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'notice' && '📢'}
                    {activity.type === 'complaint' && '📝'}
                    {activity.type === 'attendance' && '✅'}
                    {activity.type === 'grade' && '📝'}
                    {activity.type === 'chat' && '💬'}
                    {activity.type === 'timetable' && '📅'}
                  </div>
                  <div className="activity-content">
                    <p className="activity-text">{activity.description}</p>
                    <span className="activity-time">
                      {formatDate(activity.createdAt)} at {formatTime(activity.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activities">No recent activities</div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="events-section">
          <h2>Upcoming Events</h2>
          <div className="events-list">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, index) => (
                <div key={index} className="event-item">
                  <div className="event-date">
                    <div className="event-day">{new Date(event.date).getDate()}</div>
                    <div className="event-month">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                  </div>
                  <div className="event-content">
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <span className="event-time">{formatTime(event.date)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-events">No upcoming events</div>
            )}
          </div>
        </div>
      </div>

      {/* Role-specific sections */}
      {user.role === 'faculty' && (
        <div className="faculty-specific-section">
          <h2>Teaching Overview</h2>
          <div className="teaching-stats">
            <div className="teaching-stat">
              <h3>Today's Classes</h3>
              <p>{stats.todaysClasses || 0} classes scheduled</p>
            </div>
            <div className="teaching-stat">
              <h3>Attendance Due</h3>
              <p>{stats.attendanceDue || 0} classes need attendance</p>
            </div>
            <div className="teaching-stat">
              <h3>Grades Pending</h3>
              <p>{stats.gradesPending || 0} assignments to grade</p>
            </div>
          </div>
        </div>
      )}

      {user.role === 'student' && (
        <div className="student-specific-section">
          <h2>Academic Overview</h2>
          <div className="academic-stats">
            <div className="academic-stat">
              <h3>Current Semester</h3>
              <p>{user.semester || 'Not set'}</p>
            </div>
            <div className="academic-stat">
              <h3>Average Grade</h3>
              <p>{stats.averageGrade || 'N/A'}</p>
            </div>
            <div className="academic-stat">
              <h3>Attendance Rate</h3>
              <p>{stats.attendanceRate || 0}%</p>
            </div>
          </div>
        </div>
      )}

      {/* System Status (Admin Only) */}
      {user.role === 'admin' && (
        <div className="system-status-section">
          <h2>System Status</h2>
          <div className="system-status-grid">
            <div className="status-card">
              <h3>Server Status</h3>
              <div className="status-indicator online">Online</div>
            </div>
            <div className="status-card">
              <h3>Database</h3>
              <div className="status-indicator online">Connected</div>
            </div>
            <div className="status-card">
              <h3>Active Users</h3>
              <div className="status-indicator">{stats.activeUsers || 0}</div>
            </div>
            <div className="status-card">
              <h3>System Load</h3>
              <div className="status-indicator normal">Normal</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 