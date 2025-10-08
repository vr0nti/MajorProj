import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuth from '../hooks/useAuth';
import '../styles/timetable.css';

/**
 * TIMETABLE OPTIMIZATION - CLEAN IMPLEMENTATION
 * 
 * Three main tabs:
 * 1. Timetable View - Display timetables by class/semester
 * 2. AI Suggestions - Intelligent text-based recommendations  
 * 3. Analytics - Comprehensive department insights
 */

export default function TimetableOptimization() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  
  // Tab 1: Timetable View State
  const [timetables, setTimetables] = useState([]);
  const [filters, setFilters] = useState({ semesters: [], classes: [] });
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedClassForView, setSelectedClassForView] = useState('');
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  
  // Tab 2: Suggestions State
  const [classes, setClasses] = useState([]);
  const [selectedClassForSuggestions, setSelectedClassForSuggestions] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  
  // Tab 3: Analytics State
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (user.role !== 'departmentAdmin') {
      navigate('/dashboard');
      return;
    }
    loadInitialData();
  }, [user, navigate]);

  const loadInitialData = async () => {
    try {
      // Load classes for suggestions tab
      const classesRes = await axios.get('/department-admin/classes');
      console.log('Classes loaded:', classesRes.data);
      setClasses(classesRes.data);
    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('Failed to load classes: ' + (error.response?.data?.message || error.message));
    }
  };

  // ==================== TAB 1: TIMETABLE VIEW ====================

  const loadTimetables = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedSemester) params.semester = selectedSemester;
      if (selectedClassForView) params.classId = selectedClassForView;
      
      const response = await axios.get('/timetable/optimize/view', { params });
      setTimetables(response.data.data.timetables);
      setFilters(response.data.data.filters);
    } catch (error) {
      console.error('Error loading timetables:', error);
      alert('Failed to load timetables');
    } finally {
      setLoading(false);
    }
  };

  const renderTimetableView = () => (
    <div className="timetable-card">
      <div className="timetable-card-header">
        <h2 className="timetable-card-title">📅 Timetable Display</h2>
        <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#666' }}>
          View and manage timetables by class and semester
        </p>
      </div>
      
      <div className="timetable-card-body">
        {/* Filters */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '15px', 
          marginBottom: '20px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
              Filter by Semester:
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Semesters</option>
              {filters.semesters.map((sem) => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
              Filter by Class:
            </label>
            <select
              value={selectedClassForView}
              onChange={(e) => setSelectedClassForView(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Classes</option>
              {filters.classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.fullName} - {cls.semester}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={loadTimetables}
              disabled={loading}
              style={{
                width: '100%',
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Loading...' : '🔍 Load Timetables'}
            </button>
          </div>
        </div>

        {/* Timetables List */}
        {timetables.length > 0 ? (
          <div>
            <h3 style={{ color: '#495057', marginBottom: '20px' }}>
              Found {timetables.length} Timetable(s)
            </h3>
            
            <div style={{ display: 'grid', gap: '20px' }}>
              {timetables.map((tt) => (
                <div
                  key={tt._id}
                  style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '20px',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', color: '#007bff' }}>
                        {tt.class?.fullName || 'Unknown Class'}
                      </h4>
                      <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                        {tt.semester} | {tt.academicYear} | Status: {tt.status}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTimetable(selectedTimetable?._id === tt._id ? null : tt)}
                      style={{
                        background: selectedTimetable?._id === tt._id ? '#28a745' : '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}
                    >
                      {selectedTimetable?._id === tt._id ? '✓ Hide Details' : '👁️ View Details'}
                    </button>
                  </div>

                  {/* Statistics */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                    gap: '10px',
                    marginBottom: '15px'
                  }}>
                    <StatBox label="Total Periods" value={tt.statistics.totalPeriods} color="#17a2b8" />
                    <StatBox label="Class Periods" value={tt.statistics.classPeriods} color="#28a745" />
                    <StatBox label="Subjects" value={tt.statistics.uniqueSubjects} color="#ffc107" />
                    <StatBox label="Faculty" value={tt.statistics.uniqueFaculty} color="#dc3545" />
                    <StatBox label="Rooms" value={tt.statistics.uniqueRooms} color="#6f42c1" />
                    <StatBox label="Utilization" value={tt.statistics.utilizationRate + '%'} color="#007bff" />
                  </div>

                  {/* Schedule Details */}
                  {selectedTimetable?._id === tt._id && (
                    <div style={{ 
                      marginTop: '20px', 
                      padding: '15px', 
                      background: '#f8f9fa', 
                      borderRadius: '8px' 
                    }}>
                      <h5 style={{ marginTop: 0 }}>📋 Weekly Schedule</h5>
                      <div style={{ overflowX: 'auto' }}>
                        {tt.schedule.map((day, idx) => (
                          <div key={idx} style={{ marginBottom: '15px' }}>
                            <h6 style={{ 
                              textTransform: 'capitalize', 
                              color: '#007bff', 
                              marginBottom: '10px' 
                            }}>
                              {day.day}
                            </h6>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                              {day.periods.filter(p => p.type === 'class').map((period, pidx) => (
                                <div
                                  key={pidx}
                                  style={{
                                    padding: '10px',
                                    background: 'white',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}
                                >
                                  <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '5px' }}>
                                    {period.startTime} - {period.endTime}
                                  </div>
                                  <div style={{ color: '#007bff', marginBottom: '3px' }}>
                                    📚 {period.subject?.name || 'No Subject'}
                                  </div>
                                  <div style={{ color: '#666', marginBottom: '3px' }}>
                                    👨‍🏫 {period.faculty?.name || 'No Faculty'}
                                  </div>
                                  <div style={{ color: '#6c757d' }}>
                                    🏫 {period.room || 'No Room'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: '#666',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📅</div>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>No timetables found</p>
            <p style={{ fontSize: '14px' }}>Select filters and click "Load Timetables" to view</p>
          </div>
        )}
      </div>
    </div>
  );

  // ==================== TAB 2: AI SUGGESTIONS ====================

  const generateSuggestions = async () => {
    if (!selectedClassForSuggestions) {
      alert('Please select a class first');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/timetable/optimize/suggestions', {
        classId: selectedClassForSuggestions,
        analysisType: 'comprehensive'
      });
      
      setSuggestions(response.data.data.suggestions);
      setClassInfo(response.data.data.class);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      alert('Failed to generate suggestions: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderSuggestionsTab = () => (
    <div className="timetable-card">
      <div className="timetable-card-header">
        <h2 className="timetable-card-title">🤖 Intelligent Suggestions</h2>
        <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#666' }}>
          Get AI-powered recommendations to optimize your timetable
        </p>
      </div>
      
      <div className="timetable-card-body">
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          alignItems: 'flex-end', 
          marginBottom: '30px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
              Select Class to Analyze:
            </label>
            <select
              value={selectedClassForSuggestions}
              onChange={(e) => {
                setSelectedClassForSuggestions(e.target.value);
                setSuggestions([]);
                setClassInfo(null);
              }}
              className="detailed-class-dropdown"
            >
              <option value="">🎯 Choose a class to analyze...</option>
              {classes && classes.length > 0 ? (
                classes.map((cls) => {
                  // Calculate display metrics
                  const capacityStatus = cls.capacityUtilization >= 90 ? '🔴' : 
                                       cls.capacityUtilization >= 75 ? '🟡' : 
                                       cls.capacityUtilization >= 50 ? '🟢' : '⚪';
                  
                  const subjectStatus = cls.subjects?.assignmentRate >= 90 ? '✅' :
                                      cls.subjects?.assignmentRate >= 75 ? '⚠️' : '❌';
                  
                  const timetableStatus = cls.timetable?.exists ? '📅' : '❌';
                  
                  // Create detailed option text
                  const optionText = `${cls.fullName || cls.name} | ${cls.semester} | ` +
                    `👥 ${cls.currentStrength || 0}/${cls.capacity} ${capacityStatus} | ` +
                    `📚 ${cls.subjects?.total || 0} subjects ${subjectStatus} | ` +
                    `👨‍🏫 ${cls.classTeacher?.name || 'No Teacher'} | ` +
                    `${timetableStatus} ${cls.timetable?.exists ? 'Timetable' : 'No Timetable'}`;
                    
                  return (
                    <option key={cls._id} value={cls._id} title={optionText}>
                      {optionText}
                    </option>
                  );
                })
              ) : (
                <option disabled>Loading classes...</option>
              )}
            </select>
            
            {/* Class Selection Info */}
            {selectedClassForSuggestions && (
              <div className="class-overview-panel">
                {(() => {
                  const selectedClass = classes.find(c => c._id === selectedClassForSuggestions);
                  if (!selectedClass) return null;
                  
                  return (
                    <div>
                      <h6 className="class-overview-title">
                        📋 Class Overview: {selectedClass.fullName}
                      </h6>
                      <div className="class-overview-grid">
                        <div className="class-overview-metric">
                          <div className="class-overview-metric-label" style={{ color: '#28a745' }}>👥 Students</div>
                          <div className="class-overview-metric-value">{selectedClass.currentStrength || 0} / {selectedClass.capacity} ({selectedClass.capacityUtilization}% capacity)</div>
                        </div>
                        <div className="class-overview-metric">
                          <div className="class-overview-metric-label" style={{ color: '#007bff' }}>📚 Subjects</div>
                          <div className="class-overview-metric-value">{selectedClass.subjects?.total || 0} total, {selectedClass.subjects?.assigned || 0} assigned ({selectedClass.subjects?.assignmentRate || 0}%)</div>
                        </div>
                        <div className="class-overview-metric">
                          <div className="class-overview-metric-label" style={{ color: '#6f42c1' }}>👨‍🏫 Class Teacher</div>
                          <div className="class-overview-metric-value">{selectedClass.classTeacher?.name || 'Unassigned'}</div>
                        </div>
                        <div className="class-overview-metric">
                          <div className="class-overview-metric-label" style={{ color: '#dc3545' }}>📅 Timetable</div>
                          <div className="class-overview-metric-value">{selectedClass.timetable?.exists ? 'Created' : 'Not Created'}</div>
                        </div>
                      </div>
                      
                      {/* Subject Details */}
                      {selectedClass.subjects?.details && selectedClass.subjects.details.length > 0 && (
                        <details style={{ marginTop: '12px' }}>
                          <summary className="subject-details-summary">
                            📖 View Subject Details ({selectedClass.subjects.details.length} subjects, {selectedClass.subjects.totalCredits} total credits)
                          </summary>
                          <div className="subject-details-content">
                            {selectedClass.subjects.details.map((subject, idx) => (
                              <div
                                key={idx}
                                className={`subject-item ${subject.faculty !== 'Unassigned' ? 'assigned' : 'unassigned'}`}
                              >
                                <div className="subject-header">
                                  <div className="subject-basic-info">
                                    <span className="subject-code">{subject.code}</span>
                                    <span className="subject-name">{subject.name}</span>
                                    <span className="subject-credits">({subject.credits} credits)</span>
                                  </div>
                                  <div className="subject-faculty-info">
                                    {subject.faculty !== 'Unassigned' ? 
                                      `👨‍🏫 ${subject.faculty} (${subject.facultySpecialization})` : 
                                      '❌ No Faculty Assigned'
                                    }
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          <button
            onClick={generateSuggestions}
            disabled={!selectedClassForSuggestions || loading}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: (!selectedClassForSuggestions || loading) ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              opacity: (!selectedClassForSuggestions || loading) ? 0.6 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? '⏳ Analyzing...' : '🚀 Generate Suggestions'}
          </button>
        </div>

        {/* Class Info */}
        {classInfo && (
          <div style={{ 
            padding: '20px', 
            background: '#e7f3ff', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #b3d9ff'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#0056b3' }}>
              🔍 Analyzing Class: {classInfo.name}
            </h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px', 
              fontSize: '14px', 
              color: '#495057' 
            }}>
              <div style={{ 
                padding: '10px', 
                background: 'white', 
                borderRadius: '6px', 
                border: '1px solid #b3d9ff',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 'bold', color: '#007bff', marginBottom: '5px' }}>📚 Semester</div>
                <div>{classInfo.semester}</div>
              </div>
              <div style={{ 
                padding: '10px', 
                background: 'white', 
                borderRadius: '6px', 
                border: '1px solid #b3d9ff',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 'bold', color: '#28a745', marginBottom: '5px' }}>👥 Students</div>
                <div>{classInfo.studentCount}/{classInfo.capacity}</div>
              </div>
              <div style={{ 
                padding: '10px', 
                background: 'white', 
                borderRadius: '6px', 
                border: '1px solid #b3d9ff',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 'bold', color: '#6f42c1', marginBottom: '5px' }}>📊 Capacity</div>
                <div>{((classInfo.studentCount / classInfo.capacity) * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div style={{ 
              marginTop: '10px', 
              padding: '8px 12px', 
              background: 'rgba(255,255,255,0.7)', 
              borderRadius: '4px', 
              fontSize: '12px', 
              color: '#666',
              textAlign: 'center'
            }}>
              💡 AI analysis will examine timetable structure, faculty assignments, workload distribution, and optimization opportunities
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 ? (
          <div>
            <h3 style={{ color: '#495057', marginBottom: '20px' }}>
              💡 Found {suggestions.length} Suggestion(s)
            </h3>
            
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                style={{
                  border: `2px solid ${getPriorityColor(suggestion.priority)}`,
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px',
                  background: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{
                        background: getPriorityColor(suggestion.priority),
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {suggestion.priority}
                      </span>
                      <span style={{ 
                        color: '#6c757d', 
                        fontSize: '14px', 
                        fontWeight: 'bold' 
                      }}>
                        {suggestion.category}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 10px 0', color: '#007bff', fontSize: '18px' }}>
                      {suggestion.issue}
                    </h4>
                  </div>
                  <span style={{ fontSize: '32px' }}>
                    {suggestion.actionable ? '✅' : '📋'}
                  </span>
                </div>

                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '6px', 
                  marginBottom: '15px',
                  borderLeft: '4px solid #28a745'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#28a745', marginBottom: '5px', fontSize: '14px' }}>
                    💡 Suggestion:
                  </div>
                  <div style={{ color: '#495057', lineHeight: '1.6' }}>
                    {suggestion.suggestion}
                  </div>
                </div>

                <div style={{ 
                  padding: '12px', 
                  background: '#fff3cd', 
                  borderRadius: '6px',
                  border: '1px solid #ffc107',
                  marginBottom: '15px'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#856404', fontSize: '14px' }}>
                    📊 Impact: {suggestion.impact}
                  </div>
                </div>

                {suggestion.details && Object.keys(suggestion.details).length > 0 && (
                  <details style={{ marginTop: '15px' }}>
                    <summary style={{ 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      color: '#007bff',
                      padding: '10px',
                      background: '#f8f9fa',
                      borderRadius: '4px'
                    }}>
                      🔍 View Detailed Analysis
                    </summary>
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '15px', 
                      background: '#f8f9fa', 
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      <pre style={{ 
                        margin: 0, 
                        whiteSpace: 'pre-wrap', 
                        fontFamily: 'monospace',
                        color: '#495057'
                      }}>
                        {JSON.stringify(suggestion.details, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        ) : classInfo ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: '#666',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>No Issues Found!</p>
            <p style={{ fontSize: '14px' }}>The timetable for this class looks optimal.</p>
          </div>
        ) : null}
      </div>
    </div>
  );

  // ==================== TAB 3: ANALYTICS ====================

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/timetable/optimize/analytics');
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      alert('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const renderAnalyticsTab = () => (
    <div className="timetable-card">
      <div className="timetable-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="timetable-card-title">📊 Department Analytics</h2>
          <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#666' }}>
            Comprehensive insights and analytics for your department
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '⏳ Loading...' : '🔄 Refresh Analytics'}
        </button>
      </div>
      
      <div className="timetable-card-body">
        {analytics ? (
          <div>
            {/* Overview */}
            <section style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#495057', marginBottom: '15px' }}>🏛️ Overview - {analytics.overview.departmentName}</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px' 
              }}>
                <StatCard 
                  icon="📚" 
                  label="Total Classes" 
                  value={analytics.overview.totalClasses} 
                  color="#007bff" 
                />
                <StatCard 
                  icon="📅" 
                  label="Timetables" 
                  value={analytics.overview.totalTimetables} 
                  color="#28a745" 
                />
                <StatCard 
                  icon="👨‍🏫" 
                  label="Faculty" 
                  value={analytics.overview.totalFaculty} 
                  color="#ffc107" 
                />
                <StatCard 
                  icon="👥" 
                  label="Students" 
                  value={analytics.overview.totalStudents} 
                  color="#dc3545" 
                />
              </div>
            </section>

            {/* Schedule Health */}
            <section style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#495057', marginBottom: '15px' }}>🏥 Schedule Health</h3>
              <div style={{ 
                padding: '20px', 
                background: '#f8f9fa', 
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                  <MetricBox label="Health Score" value={analytics.scheduleHealth.healthScore + '%'} />
                  <MetricBox label="Completion Rate" value={analytics.scheduleHealth.completionRate + '%'} />
                  <MetricBox label="Avg Utilization" value={analytics.scheduleHealth.averageUtilization + '%'} />
                  <MetricBox label="Status" value={analytics.scheduleHealth.status} />
                  <MetricBox label="Pending Classes" value={analytics.scheduleHealth.pendingClasses} />
                </div>
              </div>
            </section>

            {/* Faculty Workload */}
            <section style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#495057', marginBottom: '15px' }}>👨‍🏫 Faculty Workload</h3>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  <MetricBox label="Total Faculty" value={analytics.facultyWorkload.summary.totalFaculty} />
                  <MetricBox label="Average Load" value={analytics.facultyWorkload.summary.averageLoad + ' periods'} />
                  <MetricBox label="Overloaded" value={analytics.facultyWorkload.summary.overloaded} />
                  <MetricBox label="Underutilized" value={analytics.facultyWorkload.summary.underutilized} />
                </div>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="timetable-table enhanced" style={{ width: '100%', marginTop: '15px' }}>
                  <thead>
                    <tr>
                      <th>Faculty Name</th>
                      <th>Specialization</th>
                      <th>Periods</th>
                      <th>Hours</th>
                      <th>Classes</th>
                      <th>Subjects</th>
                      <th>Workload Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.facultyWorkload.faculty.slice(0, 10).map((fac, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{fac.name}</td>
                        <td>{fac.specialization || 'N/A'}</td>
                        <td>{fac.totalPeriods}</td>
                        <td>{fac.totalHours}</td>
                        <td>{fac.classes}</td>
                        <td>{fac.subjects}</td>
                        <td>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background: getWorkloadColor(fac.workloadLevel),
                            color: 'white'
                          }}>
                            {fac.workloadLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Room Utilization */}
            <section style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#495057', marginBottom: '15px' }}>🏫 Room Utilization</h3>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  <MetricBox label="Total Rooms" value={analytics.roomUtilization.summary.totalRooms} />
                  <MetricBox label="Avg Utilization" value={analytics.roomUtilization.summary.averageUtilization + '%'} />
                  <MetricBox label="Most Used" value={analytics.roomUtilization.summary.mostUsed} />
                  <MetricBox label="Least Used" value={analytics.roomUtilization.summary.leastUsed} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {analytics.roomUtilization.rooms.map((room, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '15px',
                      background: 'white',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '10px', color: '#007bff' }}>
                      🏫 {room.room}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                      Periods: {room.totalPeriods}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                      Days: {room.daysUsed}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                      Classes: {room.classesUsing}
                    </div>
                    <div style={{ 
                      padding: '8px', 
                      background: '#e7f3ff', 
                      borderRadius: '4px', 
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#007bff'
                    }}>
                      {room.utilizationRate}% Utilized
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Subject Distribution */}
            <section style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#495057', marginBottom: '15px' }}>📖 Subject Distribution</h3>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  <MetricBox label="Total Subjects" value={analytics.subjectDistribution.summary.totalSubjects} />
                  <MetricBox label="Theory Subjects" value={analytics.subjectDistribution.summary.theorySubjects} />
                  <MetricBox label="Lab Subjects" value={analytics.subjectDistribution.summary.labSubjects} />
                  <MetricBox label="Avg Credits" value={analytics.subjectDistribution.summary.averageCredits} />
                </div>
              </div>
            </section>

            {/* Recommendations */}
            {analytics.recommendations.length > 0 && (
              <section>
                <h3 style={{ color: '#495057', marginBottom: '15px' }}>⚠️ Recommendations</h3>
                {analytics.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '15px',
                      marginBottom: '15px',
                      background: rec.type === 'critical' ? '#ffe6e6' : rec.type === 'medium' ? '#fff3cd' : '#e7f3ff',
                      border: `1px solid ${rec.type === 'critical' ? '#ff9999' : rec.type === 'medium' ? '#ffc107' : '#b3d9ff'}`,
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#495057' }}>
                      {rec.title}
                    </div>
                    <div style={{ color: '#666', marginBottom: '8px' }}>
                      {rec.message}
                    </div>
                    <div style={{ fontSize: '14px', color: '#007bff', fontWeight: 'bold' }}>
                      Action: {rec.action}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: '#666',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>No analytics loaded</p>
            <p style={{ fontSize: '14px' }}>Click "Refresh Analytics" to load department insights</p>
          </div>
        )}
      </div>
    </div>
  );

  // ==================== HELPER COMPONENTS ====================

  const StatBox = ({ label, value, color }) => (
    <div style={{
      background: color + '15',
      border: `1px solid ${color}`,
      padding: '12px',
      borderRadius: '6px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: color, marginBottom: '5px' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        {label}
      </div>
    </div>
  );

  const StatCard = ({ icon, label, value, color }) => (
    <div style={{
      padding: '20px',
      background: 'white',
      border: `2px solid ${color}`,
      borderRadius: '8px',
      textAlign: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: color, marginBottom: '5px' }}>
        {value}
      </div>
      <div style={{ fontSize: '14px', color: '#666' }}>
        {label}
      </div>
    </div>
  );

  const MetricBox = ({ label, value }) => (
    <div style={{
      padding: '15px',
      background: 'white',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff', marginBottom: '5px' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        {label}
      </div>
    </div>
  );

  const getPriorityColor = (priority) => {
    const colors = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745'
    };
    return colors[priority] || '#6c757d';
  };

  const getWorkloadColor = (level) => {
    const colors = {
      'Overloaded': '#dc3545',
      'Optimal': '#28a745',
      'Moderate': '#ffc107',
      'Underutilized': '#6c757d'
    };
    return colors[level] || '#6c757d';
  };

  // ==================== MAIN RENDER ====================

  return (
    <div className="timetable-container">
      <button onClick={() => navigate('/dashboard')} className="back-btn">
        ← Back to Dashboard
      </button>

      <div className="timetable-header">
        <h1 className="timetable-title">🚀 Timetable Optimization</h1>
        <p className="timetable-subtitle">
          View timetables, get intelligent suggestions, and analyze department performance
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #dee2e6'
      }}>
        {[
          { key: 'view', label: 'Timetable View', icon: '📅' },
          { key: 'suggestions', label: 'AI Suggestions', icon: '🤖' },
          { key: 'analytics', label: 'Analytics', icon: '📊' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.key ? '#007bff' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#007bff',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #007bff' : 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              transition: 'all 0.3s',
              borderRadius: '8px 8px 0 0'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'view' && renderTimetableView()}
      {activeTab === 'suggestions' && renderSuggestionsTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
    </div>
  );
}
