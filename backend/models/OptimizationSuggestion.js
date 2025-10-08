const mongoose = require('mongoose');

const OptimizationSuggestionSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  suggestionId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'faculty_workload',
      'room_utilization', 
      'time_slot_efficiency',
      'consecutive_periods',
      'break_optimization',
      'conflict_resolution'
    ]
  },
  priority: {
    type: String,
    required: true,
    enum: ['high', 'medium', 'low']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  impact: {
    type: String,
    required: true,
    trim: true
  },
  suggestions: [{
    type: mongoose.Schema.Types.Mixed,
    default: []
  }],
  implementationSteps: [{
    type: String,
    trim: true
  }],
  conflicts: [{
    type: mongoose.Schema.Types.Mixed,
    default: []
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'implemented'],
    default: 'pending'
  },
  // Approval fields
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  approvalNote: {
    type: String,
    trim: true
  },
  // Rejection fields
  rejectedBy: {
    type: String,
    trim: true
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  // Implementation tracking
  implementedBy: {
    type: String,
    trim: true
  },
  implementedAt: {
    type: Date
  },
  implementationNotes: {
    type: String,
    trim: true
  },
  // Additional metadata
  estimatedImpactScore: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  difficultyLevel: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  resourcesRequired: [{
    type: String,
    trim: true
  }],
  affectedFaculty: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  }],
  affectedRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }],
  affectedSubjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  // Analytics fields
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewed: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
OptimizationSuggestionSchema.index({ classId: 1, status: 1 });
OptimizationSuggestionSchema.index({ type: 1, priority: 1 });
OptimizationSuggestionSchema.index({ status: 1, createdAt: -1 });
OptimizationSuggestionSchema.index({ suggestionId: 1 });

// Virtual fields
OptimizationSuggestionSchema.virtual('isApproved').get(function() {
  return this.status === 'approved';
});

OptimizationSuggestionSchema.virtual('isRejected').get(function() {
  return this.status === 'rejected';
});

OptimizationSuggestionSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

OptimizationSuggestionSchema.virtual('isImplemented').get(function() {
  return this.status === 'implemented';
});

OptimizationSuggestionSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

OptimizationSuggestionSchema.virtual('ageInDays').get(function() {
  return Math.floor(this.age / (1000 * 60 * 60 * 24));
});

// Instance methods
OptimizationSuggestionSchema.methods.approve = function(approvedBy, approvalNote) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.approvalNote = approvalNote;
  return this.save();
};

OptimizationSuggestionSchema.methods.reject = function(rejectedBy, rejectionReason) {
  this.status = 'rejected';
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = rejectionReason;
  return this.save();
};

OptimizationSuggestionSchema.methods.implement = function(implementedBy, implementationNotes) {
  this.status = 'implemented';
  this.implementedBy = implementedBy;
  this.implementedAt = new Date();
  this.implementationNotes = implementationNotes;
  return this.save();
};

OptimizationSuggestionSchema.methods.incrementViewCount = function() {
  this.viewCount++;
  this.lastViewed = new Date();
  return this.save();
};

// Static methods
OptimizationSuggestionSchema.statics.findByClass = function(classId, options = {}) {
  const query = { classId };
  if (options.status) query.status = options.status;
  if (options.priority) query.priority = options.priority;
  if (options.type) query.type = options.type;
  
  return this.find(query)
    .populate('classId', 'name semester section')
    .populate('affectedFaculty', 'name email')
    .populate('affectedRooms', 'name type')
    .populate('affectedSubjects', 'name code')
    .sort({ priority: 1, createdAt: -1 });
};

OptimizationSuggestionSchema.statics.findPending = function(classId) {
  return this.findByClass(classId, { status: 'pending' });
};

OptimizationSuggestionSchema.statics.findApproved = function(classId) {
  return this.findByClass(classId, { status: 'approved' });
};

OptimizationSuggestionSchema.statics.findImplemented = function(classId) {
  return this.findByClass(classId, { status: 'implemented' });
};

OptimizationSuggestionSchema.statics.getStatistics = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        implemented: { $sum: { $cond: [{ $eq: ['$status', 'implemented'] }, 1, 0] } },
        highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        mediumPriority: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
        lowPriority: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
        avgImpactScore: { $avg: '$estimatedImpactScore' },
        avgViewCount: { $avg: '$viewCount' }
      }
    }
  ]);
};

OptimizationSuggestionSchema.statics.getTypeDistribution = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgImpactScore: { $avg: '$estimatedImpactScore' },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
      }
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        avgImpactScore: { $round: ['$avgImpactScore', 2] },
        pending: 1,
        approved: 1,
        implementationRate: {
          $cond: [
            { $gt: ['$count', 0] },
            { $round: [{ $multiply: [{ $divide: ['$approved', '$count'] }, 100] }, 1] },
            0
          ]
        },
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]);
};

OptimizationSuggestionSchema.statics.getPriorityDistribution = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 },
        avgImpactScore: { $avg: '$estimatedImpactScore' },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
      }
    },
    {
      $project: {
        priority: '$_id',
        count: 1,
        avgImpactScore: { $round: ['$avgImpactScore', 2] },
        pending: 1,
        approved: 1,
        _id: 0
      }
    },
    {
      $sort: {
        priority: 1 // high, medium, low
      }
    }
  ]);
};

OptimizationSuggestionSchema.statics.getImplementationTimeline = function(classId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        classId: mongoose.Types.ObjectId(classId),
        $or: [
          { approvedAt: { $gte: startDate } },
          { implementedAt: { $gte: startDate } }
        ]
      }
    },
    {
      $project: {
        title: 1,
        priority: 1,
        type: 1,
        status: 1,
        approvedAt: 1,
        implementedAt: 1,
        daysSinceApproval: {
          $cond: [
            { $ne: ['$approvedAt', null] },
            { $divide: [{ $subtract: [new Date(), '$approvedAt'] }, 1000 * 60 * 60 * 24] },
            null
          ]
        },
        implementationTime: {
          $cond: [
            { $and: [{ $ne: ['$approvedAt', null] }, { $ne: ['$implementedAt', null] }] },
            { $divide: [{ $subtract: ['$implementedAt', '$approvedAt'] }, 1000 * 60 * 60 * 24] },
            null
          ]
        }
      }
    },
    { $sort: { approvedAt: -1 } }
  ]);
};

// Pre-save middleware
OptimizationSuggestionSchema.pre('save', function(next) {
  // Auto-generate tags based on content
  if (this.isNew) {
    this.tags = this.generateTags();
  }
  next();
});

// Instance method to generate tags
OptimizationSuggestionSchema.methods.generateTags = function() {
  const tags = [];
  
  // Add priority as tag
  tags.push(this.priority);
  
  // Add type-based tags
  const typeKeywords = {
    faculty_workload: ['workload', 'faculty', 'distribution'],
    room_utilization: ['room', 'space', 'utilization'],
    time_slot_efficiency: ['time', 'schedule', 'efficiency'],
    consecutive_periods: ['consecutive', 'continuity'],
    break_optimization: ['break', 'rest', 'wellness'],
    conflict_resolution: ['conflict', 'clash', 'resolution']
  };
  
  if (typeKeywords[this.type]) {
    tags.push(...typeKeywords[this.type]);
  }
  
  // Add impact-based tags
  if (this.impact.toLowerCase().includes('high')) {
    tags.push('high-impact');
  } else if (this.impact.toLowerCase().includes('medium')) {
    tags.push('medium-impact');
  } else if (this.impact.toLowerCase().includes('low')) {
    tags.push('low-impact');
  }
  
  return [...new Set(tags)]; // Remove duplicates
};

// Export model
const OptimizationSuggestion = mongoose.model('OptimizationSuggestion', OptimizationSuggestionSchema);

module.exports = OptimizationSuggestion;