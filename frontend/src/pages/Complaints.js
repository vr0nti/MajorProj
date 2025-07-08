import React, { useState, useEffect, useRef } from 'react';
import '../styles/complaints.css';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuth from '../hooks/useAuth';
import { Card } from 'react-bootstrap';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const CATEGORIES = [
  'Academic',
  'Behavioral',
  'Infrastructure',
  'Administrative',
  'Other',
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'departmentAdmin', label: 'Department Admin' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'classTeacher', label: 'Class Teacher' },
];

export default function Complaints() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({ status: '', search: '' });

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    recipients: [],
    images: [],
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef();
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, [user, filters]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const res = await axios.get('/complaint', { params });
      setComplaints(res.data);
      console.log(res.data);
    } catch (err) {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setForm({ title: '', description: '', category: '', recipients: [], images: [] });
    setImagePreviews([]);
    setShowModal(true);
    setError('');
    setSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ title: '', description: '', category: '', recipients: [], images: [] });
    setImagePreviews([]);
    setError('');
    setSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFormChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const images = Array.from(files).filter(f => f.type.startsWith('image/'));
      setForm((prev) => ({ ...prev, images }));
      setImagePreviews(images.map(f => URL.createObjectURL(f)));
    } else if (type === 'select-multiple') {
      setForm((prev) => ({ ...prev, [name]: Array.from(e.target.selectedOptions).map(o => o.value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEdit = (complaint) => {
    setEditId(complaint._id);
    setForm({
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      recipients: complaint.recipients,
      images: [],
    });
    setImagePreviews(complaint.images || []);
    setShowModal(true);
    setError('');
    setSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return;
    try {
      await axios.delete(`/complaint/${id}`);
      fetchComplaints();
    } catch (err) {
      setError('Failed to delete complaint');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const data = new FormData();
      data.append('title', form.title);
      data.append('description', form.description);
      data.append('category', form.category);
      form.recipients.forEach(r => data.append('recipients[]', r));
      if (form.images && form.images.length > 0) {
        form.images.forEach(img => data.append('images', img));
      }
      console.log(form);
      for (let [key, value] of data.entries()) {
        console.log(`${key}:`, value);
      }
      if (editId) {
        await axios.put(`/complaint/${editId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post('/complaint', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setSuccess(editId ? 'Complaint updated successfully!' : 'Complaint submitted successfully!');
      handleCloseModal();
      fetchComplaints();
    } catch (err) {
      setError('Failed to submit complaint');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`/complaint/${id}/status`, { status });
      fetchComplaints();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  return (
    <div className="complaints-container">
      <button 
        onClick={() => navigate('/dashboard')} 
        className="back-btn"
      >
        Back to Dashboard
      </button>
      <div className="complaints-header">
        <h1 className="complaints-title">Complaints</h1>
        <p className="complaints-subtitle">Raise and manage complaints efficiently.</p>
        {user.role !== 'admin' && (
          <button className="complaints-btn" onClick={handleOpenModal} style={{ marginTop: 16 }}>
            + Raise Complaint
          </button>
        )}
      </div>
      <div className="complaints-filters">
        <select
          className="complaints-filter-select"
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          className="complaints-filter-select"
          type="text"
          placeholder="Search complaints..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <Card>
              <Card.Body>
                <h2 className="mb-3">{editId ? 'Edit Complaint' : 'Raise Complaint'}</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-section">
                    <label>Title</label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-section">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-section">
                    <label>Category</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-section">
                    <label>Recipients</label>
                    <select
                      name="recipients"
                      multiple
                      value={form.recipients}
                      onChange={handleFormChange}
                      required
                    >
                      {ROLE_OPTIONS.filter(opt => {
                        // Only show allowed roles based on current user role
                        if (user.role === 'student') return ['classTeacher', 'departmentAdmin', 'admin'].includes(opt.value);
                        if (user.role === 'faculty') return ['departmentAdmin', 'admin'].includes(opt.value);
                        if (user.role === 'departmentAdmin') return ['admin'].includes(opt.value);
                        return false;
                      }).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-section">
                    <label>Attach Images (optional)</label>
                    <input
                      type="file"
                      name="images"
                      multiple
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFormChange}
                    />
                    {imagePreviews.length > 0 && (
                      <div className="complaints-image-previews">
                        {imagePreviews.map((src, idx) => (
                          <img key={idx} src={src} alt="Preview" className="complaints-image-preview" />
                        ))}
                      </div>
                    )}
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  <div className="modal-actions">
                    <button type="button" onClick={handleCloseModal}>Cancel</button>
                    <button type="submit">{editId ? 'Update' : 'Submit'}</button>
                  </div>
                </form>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}
      <div className="complaints-list">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <h2 className="complaints-section-header">Complaints Raised By Me</h2>
            {complaints.filter(c => c.createdBy && c.createdBy._id === user._id).length === 0 ? (
              <div>No complaints raised by you.</div>
            ) : (
              complaints.filter(c => c.createdBy && c.createdBy._id === user._id).map((c) => (
                <div className="complaints-item" key={c._id}>
                  <div className="complaints-item-header">
                    <span className="complaints-item-title">{c.title}</span>
                    <span className="complaints-item-category">{c.category}</span>
                    <span className="complaints-item-date">{new Date(c.createdAt).toLocaleString()}</span>
                    <span className="complaints-item-recipients">To: {c.recipients.map(r => ROLE_OPTIONS.find(opt => opt.value === r)?.label || r).join(', ')}</span>
                  </div>
                  <div className="complaints-item-content">{c.description}</div>
                  {c.images && c.images.length > 0 && (
                    <div className="complaints-image-previews">
                     
                      {c.images.map((img, idx) => (
                        <a href={`${process.env.REACT_APP_API_URL?.replace('/api', '')}${img}`} target="_blank" rel="noopener noreferrer">
                          <img key={idx} src={`${process.env.REACT_APP_API_URL?.replace('/api', '')}${img}`} alt="Complaint" className="complaints-image-preview" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="complaints-item-footer">
                    <span className="complaints-item-author">By: {c.createdBy?.name || 'Unknown'}</span>
                    <span className={`complaints-status ${c.status}`}>{c.status}</span>
                    <>
                      <button className="complaints-edit-btn" onClick={() => handleEdit(c)} title="Edit Complaint">✏️</button>
                      <button className="complaints-delete-btn" onClick={() => handleDelete(c._id)} title="Delete Complaint">🗑️</button>
                    </>
                  </div>
                  {c.statusHistory && c.statusHistory.length > 0 && (
                    <div className="complaints-status-history">
                      <strong>Status History:</strong>
                      <ul>
                        {c.statusHistory.map((h, idx) => (
                          <li key={idx}>
                            {h.status} by {ROLE_OPTIONS.find(r => r.value === h.updatedBy)?.label || h.updatedBy} at {new Date(h.updatedAt).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
            <h2 className="complaints-section-header">Complaints Raised To Me</h2>
            {complaints.filter(c => c.recipients.includes(user.role) && c.createdBy && c.createdBy._id !== user._id).length === 0 ? (
              <div>No complaints raised to you.</div>
            ) : (
              complaints.filter(c => c.recipients.includes(user.role) && c.createdBy && c.createdBy._id !== user._id).map((c) => (
                <div className="complaints-item" key={c._id}>
                  <div className="complaints-item-header">
                    <span className="complaints-item-title">{c.title}</span>
                    <span className="complaints-item-category">{c.category}</span>
                    <span className="complaints-item-date">{new Date(c.createdAt).toLocaleString()}</span>
                    <span className="complaints-item-recipients">To: {c.recipients.map(r => ROLE_OPTIONS.find(opt => opt.value === r)?.label || r).join(', ')}</span>
                  </div>
                  <div className="complaints-item-content">{c.description}</div>
                  {c.images && c.images.length > 0 && (
                    <div className="complaints-image-previews">
                      {c.images.map((img, idx) => (
                        <a href={`${process.env.REACT_APP_API_URL?.replace('/api', '')}${img}`} target="_blank" rel="noopener noreferrer">
                          <img key={idx} src={`${process.env.REACT_APP_API_URL?.replace('/api', '')}${img}`} alt="Complaint" className="complaints-image-preview" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="complaints-item-footer">
                    <span className="complaints-item-author">By: {c.createdBy?.name || 'Unknown'}</span>
                    <span className={`complaints-status ${c.status}`}>{c.status}</span>
                    <select
                      className="complaints-status-select"
                      value={c.status}
                      onChange={e => handleStatusChange(c._id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {c.statusHistory && c.statusHistory.length > 0 && (
                    <div className="complaints-status-history">
                      <strong>Status History:</strong>
                      <ul>
                        {c.statusHistory.map((h, idx) => (
                          <li key={idx}>
                            {h.status} by {ROLE_OPTIONS.find(r => r.value === h.updatedBy)?.label || h.updatedBy} at {new Date(h.updatedAt).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
} 