import React, { useState } from 'react';
import { getRecommendations } from '../api/courseAi';
import '../styles/course-ai.css';

const CourseRecommendations = () => {
  const [department, setDepartment] = useState('');
  const [subjects, setSubjects] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setRecommendations(null);
    try {
      const data = await getRecommendations(department, subjects);
      if (Array.isArray(data)) {
        setRecommendations(data);
      } else {
        setError(data.error || 'No valid courses found.');
      }
    } catch (err) {
      setError('Failed to fetch recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const renderRecommendations = () => {
    if (!recommendations) return null;
    if (Array.isArray(recommendations)) {
      return (
        <div className="course-ai-cards-container">
          {recommendations.map((rec, idx) => (
            <div key={idx} className={`course-ai-card ${rec.platform?.toLowerCase() || ''}`}>
              <div className="course-ai-card-header">
                <a href={rec.link} target="_blank" rel="noopener noreferrer" className="course-ai-card-title">
                  {rec.course}
                </a>
                {rec.platform && (
                  <span className={`platform-tag ${rec.platform.toLowerCase()}`}>{rec.platform}</span>
                )}
              </div>
              <p className="course-ai-card-desc">{rec.description}</p>
              <div className="course-ai-card-footer">
                {rec.instructor && (
                  <span className="course-instructor">👨‍🏫 {rec.instructor}</span>
                )}
                {rec.rating && (
                  <span className="course-rating">⭐ {rec.rating}</span>
                )}
                {rec.duration && (
                  <span className="course-duration">⏱️ {rec.duration}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <p className="raw-response">{recommendations}</p>;
  };

  return (
    <div className="course-ai-container">
      <h2 className="course-ai-heading">AI Course Recommendations</h2>
      <form onSubmit={handleSubmit} className="course-ai-form">
        <div className="form-group">
          <label>Department</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Computer Science, Mathematics"
            required
          />
        </div>
        <div className="form-group">
          <label>Subjects (comma-separated)</label>
          <input
            type="text"
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
            placeholder="e.g. Machine Learning, Python"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="course-ai-submit-btn">
          {loading ? 'Generating…' : 'Get Recommendations'}
        </button>
      </form>

      {error && <p className="course-ai-error">{error}</p>}
      {loading ? <p>Loading…</p> : renderRecommendations()}
    </div>
  );
};

export default CourseRecommendations; 