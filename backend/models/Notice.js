const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['General', 'Academic', 'Events', 'Emergency', 'Department-specific'], 
    default: 'General' 
  },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Urgent'], 
    default: 'Medium' 
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department' 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  targetAudience: {
    type: String,
    enum: ['All', 'Department', 'Class', 'Role'],
    default: 'All'
  },
  targetDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  targetClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  targetRoles: [{
    type: String,
    enum: ['student', 'faculty', 'departmentAdmin']
  }],
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    fileType: String
  }],
  scheduledFor: { 
    type: Date 
  },
  expiresAt: { 
    type: Date 
  },
  isPublished: { 
    type: Boolean, 
    default: false 
  },
  publishedAt: { 
    type: Date 
  },
  isArchived: { 
    type: Boolean, 
    default: false 
  },
  archivedAt: { 
    type: Date 
  },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  viewCount: { 
    type: Number, 
    default: 0 
  },
  emailSent: { 
    type: Boolean, 
    default: false 
  },
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  roles: [{ type: String, enum: ['faculty', 'student', 'departmentAdmin', 'admin'] }],
  files: [{ type: String }],
}, { timestamps: true });

// Index for efficient querying
noticeSchema.index({ department: 1, isPublished: 1, expiresAt: 1 });
noticeSchema.index({ createdBy: 1, createdAt: -1 });
noticeSchema.index({ category: 1, priority: 1 });

module.exports = mongoose.model('Notice', noticeSchema); 