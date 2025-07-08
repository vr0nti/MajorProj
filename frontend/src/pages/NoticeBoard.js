import React, { useState, useEffect, useRef } from "react";
import axios from "../api/axios";
import useAuth from "../hooks/useAuth";
import "../styles/notice-board.css";

const NoticeBoard = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    departments: [],
    roles: [],
    files: [],
    targetClasses: [],
  });

  // Filters
  const [filters, setFilters] = useState({
    department: "",
    role: "",
    search: "",
    view: "all" // "all", "published-by-me", "published-to-me"
  });

  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  const roles = ["student", "faculty", "departmentAdmin", "admin"];

  // Only allow notice creation for admin, departmentAdmin, or class teacher
  const isClassTeacher = user.isClassTeacher;
  const canCreateNotice =
    user.role === "admin" ||
    user.role === "departmentAdmin" ||
    (user.role === "faculty" && isClassTeacher);

  const fileInputRef = useRef();

  useEffect(() => {
    fetchNotices();
    fetchUnreadCount();
    // if (user.role === 'departmentAdmin' || user.role === 'faculty') {
    fetchDepartments();
    fetchClasses();
    // }
  }, [user, filters]);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.department) params.department = filters.department;
      if (filters.role) params.role = filters.role;
      if (filters.search) params.search = filters.search;
      if (filters.view) params.view = filters.view;
      const response = await axios.get("/notice/all", { params });
      setNotices(response.data);
    } catch (err) {
      setError("Failed to fetch notices");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get("/notice/unread/count");
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get("/department/all");
   
      setDepartments(response.data);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get("/class/all");
      setClasses(response.data);
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData((prev) => ({ ...prev, files: Array.from(files) }));
    } else if (type === "select-multiple") {
      setFormData((prev) => ({
        ...prev,
        [name]: Array.from(e.target.selectedOptions).map((o) => o.value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("content", formData.content);
      if (user.role === "admin") {
        formData.departments.forEach((dep) =>
          data.append("departments[]", dep)
        );
        formData.roles.forEach((role) => data.append("roles[]", role));
      } else if (user.role === "departmentAdmin") {
        formData.roles.forEach((role) => data.append("roles[]", role));
      } else if (user.role === "faculty" && isClassTeacher) {
        data.append("targetClasses[]", user.class);
      }
      if (formData.files && formData.files.length > 0) {
        formData.files.forEach((file) => data.append("files", file));
      }
      await axios.post("/notice", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowCreateForm(false);
      setFormData({
        title: "",
        content: "",
        departments: [],
        roles: [],
        files: [],
        targetClasses: [],
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchNotices();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save notice");
    }
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      departments: notice.departments || [],
      roles: notice.roles || [],
      files: notice.files || [],
      targetClasses: notice.targetClasses || [],
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (noticeId) => {
    if (window.confirm("Are you sure you want to delete this notice?")) {
      try {
        await axios.delete(`/notice/delete/${noticeId}`);
        fetchNotices();
      } catch (err) {
        setError("Failed to delete notice");
      }
    }
  };

  const handleArchive = async (noticeId) => {
    try {
      await axios.put(`/notice/archive/${noticeId}`);
      fetchNotices();
    } catch (err) {
      setError("Failed to archive notice");
    }
  };

  const handleViewNotice = async (notice) => {
    setSelectedNotice(notice);
    // Mark as read
    try {
      await axios.get(`/notice/${notice._id}`);
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to mark notice as read:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      departments: [],
      roles: [],
      files: [],
      targetClasses: [],
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Urgent":
        return "#dc3545";
      case "High":
        return "#fd7e14";
      case "Medium":
        return "#ffc107";
      case "Low":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Emergency":
        return "🚨";
      case "Academic":
        return "📚";
      case "Events":
        return "🎉";
      case "Department-specific":
        return "🏢";
      default:
        return "📢";
    }
  };

  const canEditNotice = (notice) => {
    return notice.createdBy._id === user.id || user.role === "admin";
  };

  const isPublishedByMe = (notice) => {
    return notice.createdBy._id === user.id;
  };

  const getNoticeCardClass = (notice) => {
    let className = "notice-card";
    if (isPublishedByMe(notice)) {
      className += " published-by-me";
    }
    return className;
  };

  return (
    <div className="notice-board-container">
      <div className="notice-board-header">
        <div className="header-left">
          <h1>Notice Board</h1>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount} unread</span>
          )}
        </div>
        {canCreateNotice && (
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? "Cancel" : "Create Notice"}
          </button>
        )}
      </div>

      {/* {error && <div className="error-message">{error}</div>} */}

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <input
            type="text"
            placeholder="Search notices..."
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value, page: 1 })
            }
            className="search-input"
          />
          
          {/* View Filter - Show different options based on user role */}
          {user.role !== 'student' && (
            <select
              value={filters.view}
              onChange={(e) =>
                setFilters({ ...filters, view: e.target.value, page: 1 })
              }
            >
              <option value="all">All Notices</option>
              <option value="published-by-me">Published by Me</option>
              <option value="published-to-me">Published to Me</option>
            </select>
          )}
          
          {user.role === 'admin' && (
          <select
            value={filters.department}
            onChange={(e) =>
              setFilters({ ...filters, department: e.target.value, page: 1 })
            }
          >
            <option value="">All Departments</option>
            {departments.map((dep) => (
              <option key={dep._id} value={dep._id}>
                {dep.name}
              </option>
            ))}
          </select>
          )}
          <select
            value={filters.role}
            onChange={(e) =>
              setFilters({ ...filters, role: e.target.value, page: 1 })
            }
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create/Edit Notice Form */}
      {showCreateForm && (
        <div className="notice-form-section">
          <h3>{editingNotice ? "Edit Notice" : "Create New Notice"}</h3>
          <form onSubmit={handleSubmit} className="notice-form">
            <div className="form-row">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Content *</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleFormChange}
                  rows="3"
                  required
                  placeholder="Enter notice content..."
                />
              </div>
            </div>

            {user.role === "admin" && (
              <>
                <div className="form-group">
                  <label>Departments (Can be selected multiple)</label>
                  <select
                    name="departments"
                    multiple
                    value={formData.departments}
                    onChange={handleFormChange}
                  >
                   
                    {departments.map((dep) => (
                      <option key={dep._id} value={dep._id}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Roles(Can be selected multiple)</label>
                  <select
                    name="roles"
                    multiple
                    value={formData.roles}
                    onChange={handleFormChange}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {user.role === "departmentAdmin" && (
              <>
                <div className="form-group">
                  <label>Roles</label>
                  <select
                    name="roles"
                    multiple
                    value={formData.roles}
                    onChange={handleFormChange}
                  >
                    {roles
                      .filter((r) => r !== "admin" && r !== "departmentAdmin")
                      .map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            )}

            {user.role === "faculty" && isClassTeacher && (
              <>
               
                <div className="form-group">
                  <label>Class</label>
                  <input
                    type="text"
                    value={
                      classes.find((c) => c.classTeacher?._id === user.id)?.fullName || ""
                    }
                    disabled
                    style={{cursor: "not-allowed"}}
                  />
                  <div
                    style={{
                      fontSize: "0.95em",
                      color: "#666",
                      marginBottom: 8,
                    }}
                  >
                    Notice will be sent to students of your class only.
                  </div>
                </div>
              </>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Attach Files (optional)</label>
                <input
                  type="file"
                  name="files"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingNotice ? "Update Notice" : "Create Notice"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingNotice(null);
                  resetForm();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notices List */}
      
      <div className="notices-section">
        {loading ? (
          <div className="loading">Loading notices...</div>
        ) : (
          <>
          {console.log("notices",notices)}
            <div className="notices-grid">
              {notices.notices &&
                notices.notices.filter(notice => notice.roles.includes(user.role) || (isPublishedByMe(notice))).map((notice) => (
                  <div key={notice._id} className={getNoticeCardClass(notice)}>
                    <div className="notice-header">
                      <div className="notice-meta">
                        <span className="category-icon">
                          {getCategoryIcon(notice.category)}
                        </span>
                        <span className="category">{notice.category}</span>
                        <span
                          className="priority-badge"
                          style={{
                            backgroundColor: getPriorityColor(notice.priority),
                          }}
                        >
                          {notice.priority}
                        </span>
                        {isPublishedByMe(notice) && (
                          <span className="published-by-me-badge">
                            Published by You
                          </span>
                        )}
                      </div>
                      <div className="notice-actions">
                        {canEditNotice(notice) && (
                          <>
                            <button
                              className="btn btn-small btn-secondary"
                              onClick={() => handleEdit(notice)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-small btn-danger"
                              onClick={() => handleDelete(notice._id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      className="notice-content"
                      onClick={() => handleViewNotice(notice)}
                    >
                      <h3 className="notice-title">{notice.title}</h3>
                      <p className="notice-excerpt">
                        {notice.content.length > 150
                          ? notice.content.substring(0, 150) + "..."
                          : notice.content}
                      </p>
                      <div className="notice-footer">
                        <span className="author">
                          By {notice.createdBy?.name}
                        </span>
                        <span className="date">
                          {new Date(notice.createdAt).toLocaleDateString()}
                        </span>
                        {notice.viewCount > 0 && (
                          <span className="views">
                            {notice.viewCount} views
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {notices.length === 0 && (
              <div className="no-data">
                No notices found for the selected filters.
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary"
                  disabled={filters.page <= 1}
                  onClick={() =>
                    setFilters({ ...filters, page: filters.page - 1 })
                  }
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={filters.page >= totalPages}
                  onClick={() =>
                    setFilters({ ...filters, page: filters.page + 1 })
                  }
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div className="modal-overlay" onClick={() => setSelectedNotice(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedNotice.title}</h2>
              <button
                className="modal-close"
                onClick={() => setSelectedNotice(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="notice-detail-meta">
                <span className="category-icon">
                  {getCategoryIcon(selectedNotice.category)}
                </span>
                <span className="category">{selectedNotice.category}</span>
                <span
                  className="priority-badge"
                  style={{
                    backgroundColor: getPriorityColor(selectedNotice.priority),
                  }}
                >
                  {selectedNotice.priority}
                </span>
                <span className="author">
                  By {selectedNotice.createdBy?.name}
                </span>
                <span className="date">
                  {new Date(selectedNotice.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="notice-detail-content">
                {selectedNotice.content.split("\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              {selectedNotice.files && selectedNotice.files.length > 0 && (
                <div className="notice-files">
                  <strong>Attachments:</strong>
                  <ul>
                  
                    {selectedNotice.files.map((file, idx) => (
                      <li key={idx}>
                        <a
                          href={`${process.env.REACT_APP_API_URL.replace(
                            "/api",
                            ""
                          )}${file}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            className="notice-file-image"
                            src={`${process.env.REACT_APP_API_URL.replace(
                              "/api",
                              ""
                            )}${file}`}
                            alt="Attachment"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;
