import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import useAuth from '../hooks/useAuth';
import '../styles/department-admin-dashboard.css';

const semesters = [
  '1st Semester', '2nd Semester', '3rd Semester', '4th Semester',
  '5th Semester', '6th Semester', '7th Semester', '8th Semester'
];

const DepartmentAdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalFaculty: 0,
    totalSubjects: 0,
    totalStudents: 0,
    recentClasses: [],
    recentFaculty: []
  });
  const [loading, setLoading] = useState(true);
  const [releaseModal, setReleaseModal] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseMessage, setReleaseMessage] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/dashboard', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseGrades = async () => {
    setReleaseLoading(true);
    setReleaseMessage('');
    try {
      await axios.post('/grade/release-semester', {
        semester: selectedSemester,
        academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
      });
      setReleaseMessage('Grades released successfully!');
    } catch (err) {
      setReleaseMessage(err.response?.data?.message || 'Failed to release grades.');
    } finally {
      setReleaseLoading(false);
      setReleaseModal(false);
    }
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
        <h1>Department Admin Dashboard</h1>
        <p>Welcome back, {user.name}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon classes-icon">📚</div>
          <div className="stat-content">
            <h3>{stats.totalClasses}</h3>
            <p>Total Classes</p>
          </div>
          <Link to="/department-admin/classes" className="stat-link">View All</Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon faculty-icon">👨‍🏫</div>
          <div className="stat-content">
            <h3>{stats.totalFaculty}</h3>
            <p>Total Faculty</p>
          </div>
          <Link to="/department-admin/faculty" className="stat-link">View All</Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon subjects-icon">📖</div>
          <div className="stat-content">
            <h3>{stats.totalSubjects}</h3>
            <p>Total Subjects</p>
          </div>
          <Link to="/department-admin/subjects" className="stat-link">View All</Link>
        </div>

        <div className="stat-card">
          <div className="stat-icon students-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
          <Link to="/department-admin/students" className="stat-link">View All</Link>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/department-admin/classes" className="action-card">
            <div className="action-icon">➕</div>
            <h3>Add New Class</h3>
            <p>Create a new class for your department</p>
          </Link>

          <Link to="/department-admin/faculty" className="action-card">
            <div className="action-icon">👨‍🏫</div>
            <h3>Add Faculty</h3>
            <p>Add new faculty members to your department</p>
          </Link>

          <Link to="/department-admin/subjects" className="action-card">
            <div className="action-icon">📖</div>
            <h3>Add Subject</h3>
            <p>Create new subjects for your department</p>
          </Link>

          <Link to="/department-admin/students" className="action-card">
            <div className="action-icon">👥</div>
            <h3>Add Student</h3>
            <p>Register new students in your department</p>
          </Link>
        </div>
      </div>

      <div className="recent-section">
        <div className="recent-classes">
          <h2>Recent Classes</h2>
          <div className="recent-list">
            {stats.recentClasses.length > 0 ? (
              stats.recentClasses.map((cls, index) => (
                <div key={index} className="recent-item">
                  <div className="item-info">
                    <h4>{cls.name}</h4>
                    <p>{cls.subject} • {cls.faculty}</p>
                  </div>
                  <Link to={`/department-admin/classes`} className="view-link">View</Link>
                </div>
              ))
            ) : (
              <p className="no-data">No recent classes</p>
            )}
          </div>
        </div>

        <div className="recent-faculty">
          <h2>Recent Faculty</h2>
          <div className="recent-list">
            {stats.recentFaculty.length > 0 ? (
              stats.recentFaculty.map((faculty, index) => (
                <div key={index} className="recent-item">
                  <div className="item-info">
                    <h4>{faculty.name}</h4>
                    <p>{faculty.email} • {faculty.subject}</p>
                  </div>
                  <Link to={`/department-admin/faculty`} className="view-link">View</Link>
                </div>
              ))
            ) : (
              <p className="no-data">No recent faculty</p>
            )}
          </div>
        </div>
      </div>

      {/* Release Semester Grades Section */}
      <div className="release-semester-section">
        <h2>Release Semester Grades</h2>
        <div className="release-controls">
          <select
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value)}
            className="semester-select"
          >
            <option value="">Select Semester</option>
            {semesters.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            disabled={!selectedSemester}
            onClick={() => setReleaseModal(true)}
          >
            Release Grades
          </button>
        </div>
        {releaseMessage && <div className="release-message">{releaseMessage}</div>}
      </div>

      {/* Confirmation Modal */}
      {releaseModal && (
        <div className="modal-overlay" onClick={() => setReleaseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Confirm Release</h3>
            <p>Are you sure you want to release grades for <b>{selectedSemester}</b>? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={handleReleaseGrades} disabled={releaseLoading}>
                {releaseLoading ? 'Releasing...' : 'Yes, Release'}
              </button>
              <button className="btn btn-secondary" onClick={() => setReleaseModal(false)} disabled={releaseLoading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentAdminDashboard; 