import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuth from '../hooks/useAuth';
import '../styles/timetable.css';
import { exportAnalyticsToExcel } from '../utils/timetableExport';

export default function TimetableAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [facultyWorkload, setFacultyWorkload] = useState([]);
  const [roomUtilization, setRoomUtilization] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('faculty');

  useEffect(() => {
    if (user.role !== 'admin' && user.role !== 'departmentAdmin') {
      navigate('/dashboard');
      return;
    }
    fetchAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const departmentParam = user.role === 'departmentAdmin' ? `?departmentId=${user.department}` : '';
      
      const [workloadRes, utilizationRes] = await Promise.all([
        axios.get(`/timetable/analytics/faculty-workload${departmentParam}`),
        axios.get(`/timetable/analytics/room-utilization${departmentParam}`)
      ]);

      setFacultyWorkload(workloadRes.data);
      setRoomUtilization(utilizationRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadColor = (hours) => {
    if (hours < 10) return '#28a745'; // green
    if (hours < 20) return '#ffc107'; // yellow
    return '#dc3545'; // red
  };

  const getUtilizationColor = (percentage) => {
    if (percentage < 40) return '#28a745'; // green - underutilized
    if (percentage < 70) return '#ffc107'; // yellow - optimal
    return '#dc3545'; // red - overutilized
  };

  if (loading) {
    return (
      <div className="timetable-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timetable-container">
      <button onClick={() => navigate('/dashboard')} className="back-btn">
        Back to Dashboard
      </button>

      <div className="timetable-header">
        <h1 className="timetable-title">Timetable Analytics</h1>
        <p className="timetable-subtitle">View faculty workload and room utilization statistics</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #ddd'
      }}>
        <button
          onClick={() => setActiveTab('faculty')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'faculty' ? '#007bff' : 'transparent',
            color: activeTab === 'faculty' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'faculty' ? '3px solid #007bff' : 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          Faculty Workload
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'rooms' ? '#007bff' : 'transparent',
            color: activeTab === 'rooms' ? 'white' : '#007bff',
            border: 'none',
            borderBottom: activeTab === 'rooms' ? '3px solid #007bff' : 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          Room Utilization
        </button>
      </div>

      {/* Faculty Workload Tab */}
      {activeTab === 'faculty' && (
        <div className="timetable-card">
          <div className="timetable-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="timetable-card-title">Faculty Workload Analysis</h2>
              <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#666' }}>
                Total Faculty: {facultyWorkload.length} | Average Hours: {
                  facultyWorkload.length > 0 
                    ? (facultyWorkload.reduce((sum, f) => sum + f.totalHours, 0) / facultyWorkload.length).toFixed(2)
                    : 0
                }
              </p>
            </div>
            {facultyWorkload.length > 0 && (
              <button 
                onClick={() => exportAnalyticsToExcel(facultyWorkload, 'faculty', 'faculty_workload_report')}
                className="no-print"
                style={{
                  padding: '8px 16px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📊 Export to Excel
              </button>
            )}
          </div>
          <div className="timetable-card-body">
            {facultyWorkload.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666' }}>No faculty workload data available</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="timetable-table enhanced" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Faculty Name</th>
                      <th>Total Hours</th>
                      <th>Periods</th>
                      <th>Classes</th>
                      <th>Subjects</th>
                      <th>Workload Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyWorkload.map((faculty, index) => (
                      <tr key={faculty.facultyId}>
                        <td style={{ textAlign: 'left', fontWeight: 'bold' }}>
                          {index + 1}. {faculty.facultyName}
                        </td>
                        <td>
                          <span style={{ 
                            color: getWorkloadColor(faculty.totalHours),
                            fontWeight: 'bold'
                          }}>
                            {faculty.totalHours} hrs
                          </span>
                        </td>
                        <td>{faculty.periodsCount}</td>
                        <td>{faculty.classesCount}</td>
                        <td>{faculty.subjectsCount}</td>
                        <td>
                          <span style={{
                            padding: '5px 10px',
                            borderRadius: '15px',
                            fontSize: '12px',
                            background: getWorkloadColor(faculty.totalHours) + '22',
                            color: getWorkloadColor(faculty.totalHours),
                            fontWeight: 'bold'
                          }}>
                            {faculty.totalHours < 10 ? 'Light' : faculty.totalHours < 20 ? 'Moderate' : 'Heavy'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Detailed breakdown */}
                <div style={{ marginTop: '30px' }}>
                  <h3 style={{ marginBottom: '15px' }}>Detailed Breakdown</h3>
                  {facultyWorkload.slice(0, 5).map((faculty, index) => (
                    <details key={faculty.facultyId} style={{ 
                      marginBottom: '15px',
                      padding: '15px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}>
                      <summary style={{ 
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        color: '#495057'
                      }}>
                        {faculty.facultyName} ({faculty.totalHours} hours/week)
                      </summary>
                      <div style={{ marginTop: '15px', paddingLeft: '20px' }}>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>Classes:</strong>
                          <ul style={{ marginTop: '5px', marginBottom: '0' }}>
                            {faculty.classes.map((cls, i) => (
                              <li key={i}>{cls}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong>Subjects:</strong>
                          <ul style={{ marginTop: '5px', marginBottom: '0' }}>
                            {faculty.subjects.map((sub, i) => (
                              <li key={i}>{sub}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Room Utilization Tab */}
      {activeTab === 'rooms' && (
        <div className="timetable-card">
          <div className="timetable-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="timetable-card-title">Room Utilization Analysis</h2>
              <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#666' }}>
                Total Rooms: {roomUtilization.length} | Average Utilization: {
                  roomUtilization.length > 0 
                    ? (roomUtilization.reduce((sum, r) => sum + r.utilizationPercentage, 0) / roomUtilization.length).toFixed(1)
                    : 0
                }%
              </p>
            </div>
            {roomUtilization.length > 0 && (
              <button 
                onClick={() => exportAnalyticsToExcel(roomUtilization, 'room', 'room_utilization_report')}
                className="no-print"
                style={{
                  padding: '8px 16px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📊 Export to Excel
              </button>
            )}
          </div>
          <div className="timetable-card-body">
            {roomUtilization.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666' }}>No room utilization data available</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="timetable-table enhanced" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Room</th>
                      <th>Total Hours</th>
                      <th>Periods</th>
                      <th>Classes</th>
                      <th>Utilization</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomUtilization.map((room, index) => (
                      <tr key={room.room}>
                        <td style={{ textAlign: 'left', fontWeight: 'bold' }}>
                          {index + 1}. {room.room}
                        </td>
                        <td>{room.totalHours} hrs</td>
                        <td>{room.periodsCount}</td>
                        <td>{room.classesCount}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              flex: 1,
                              height: '20px',
                              background: '#e9ecef',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              position: 'relative'
                            }}>
                              <div style={{
                                width: `${Math.min(room.utilizationPercentage, 100)}%`,
                                height: '100%',
                                background: getUtilizationColor(room.utilizationPercentage),
                                transition: 'width 0.3s'
                              }} />
                            </div>
                            <span style={{ 
                              fontWeight: 'bold',
                              color: getUtilizationColor(room.utilizationPercentage),
                              minWidth: '50px'
                            }}>
                              {room.utilizationPercentage}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: '5px 10px',
                            borderRadius: '15px',
                            fontSize: '12px',
                            background: getUtilizationColor(room.utilizationPercentage) + '22',
                            color: getUtilizationColor(room.utilizationPercentage),
                            fontWeight: 'bold'
                          }}>
                            {room.utilizationPercentage < 40 ? 'Under-utilized' : 
                             room.utilizationPercentage < 70 ? 'Optimal' : 'Over-utilized'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Room details */}
                <div style={{ marginTop: '30px' }}>
                  <h3 style={{ marginBottom: '15px' }}>Room Details</h3>
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '15px'
                  }}>
                    {roomUtilization.slice(0, 6).map((room) => (
                      <div key={room.room} style={{
                        padding: '15px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}>
                        <h4 style={{ 
                          marginTop: 0,
                          marginBottom: '10px',
                          color: '#495057'
                        }}>
                          {room.room}
                        </h4>
                        <p style={{ fontSize: '14px', margin: '5px 0', color: '#6c757d' }}>
                          <strong>Hours:</strong> {room.totalHours}/week
                        </p>
                        <p style={{ fontSize: '14px', margin: '5px 0', color: '#6c757d' }}>
                          <strong>Periods:</strong> {room.periodsCount}
                        </p>
                        <p style={{ fontSize: '14px', margin: '5px 0', color: '#6c757d' }}>
                          <strong>Classes:</strong> {room.classes.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print metadata */}
      <div className="print-metadata">
        Generated on: {new Date().toLocaleDateString()} | 
        Timetable Analytics Report
      </div>
    </div>
  );
}
