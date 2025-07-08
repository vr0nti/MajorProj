const Notice = require('../models/Notice');
const User = require('../models/User');
const Department = require('../models/Department');
const Class = require('../models/Class');
const { getFileInfo, deleteFile } = require('../middlewares/upload');
const { sendNoticeNotifications } = require('../services/emailService');
const path = require('path');

// Create notice
exports.createNotice = async (req, res) => {
  try {
    const user = req.user;
    console.log("req.body",req.body);
    const { title, content, departments, roles, targetClasses } = req.body;
    let files = [];
    if (req.files) {
      files = req.files.map(f => '/uploads/' + path.basename(f.path));
    } else if (req.file) {
      files = ['/uploads/' + path.basename(req.file.path)];
    }
    let noticeData = {
      title,
      content,
      createdBy: user._id,
      files,
    };
   
    if (user.role === 'admin') {
      noticeData.departments = departments && departments.length ? departments : [];
      noticeData.roles = roles && roles.length ? roles : [];
    } else if (user.role === 'departmentAdmin') {
      noticeData.departments = [user.department];
      noticeData.roles = roles && roles.length ? roles : [];
    } else if (user.role === 'faculty' && user.isClassTeacher) {
      noticeData.targetClasses = targetClasses && targetClasses.length ? targetClasses : [user.class];
      noticeData.roles = ['student'];
    } else {
      return res.status(403).json({ message: 'Not authorized to create notice' });
    }
    const notice = await Notice.create(noticeData);
    res.status(201).json(notice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all notices (filtered by user's access)
exports.getAllNotices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      priority,
      search,
      status,
      view = 'all' // New parameter: 'all', 'published-by-me', 'published-to-me'
    } = req.query;

    const filter = {};

    // Add filters
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (status === 'published') filter.isPublished = true;
    if (status === 'draft') filter.isPublished = false;

    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Handle view filter
    if (view === 'published-by-me') {
      // Show only notices created by the current user
      filter.createdBy = req.user._id;
    } else if (view === 'published-to-me') {
      // Show notices published to the current user (exclude their own notices)
      filter.createdBy = { $ne: req.user._id };
      
      // Role-based filtering for notices published to the user
      if (req.user.role === 'admin') {
        // Admin can see all notices published to them (no additional filtering needed)
      } else if (req.user.role === 'departmentAdmin') {
        filter.$or = [
          { departments: req.user.department },
          { roles: { $in: ['departmentAdmin', 'faculty', 'student'] } }
        ];
      } else if (req.user.role === 'faculty') {
        filter.$or = [
          { departments: req.user.department },
          { roles: 'faculty' },
          { targetClasses: req.user.class }
        ];
      } else if (req.user.role === 'student') {
        filter.$or = [
          { departments: req.user.department },
          { roles: 'student' },
          { targetClasses: req.user.class }
        ];
      }
    } else {
      // Default 'all' view - show notices based on user's access
      if (req.user.role === 'admin') {
        // Admin can see all notices
      } else if (req.user.role === 'departmentAdmin') {
        filter.$or = [
          { departments: req.user.department },
          { roles: { $in: ['departmentAdmin', 'faculty', 'student'] } },
          { createdBy: req.user._id }
        ];
      } else if (req.user.role === 'faculty') {
        filter.$or = [
          { departments: req.user.department },
          { roles: 'faculty' },
          { targetClasses: req.user.class },
          { createdBy: req.user._id }
        ];
      } else if (req.user.role === 'student') {
        filter.$or = [
          { departments: req.user.department },
          { roles: 'student' },
          { targetClasses: req.user.class }
        ];
      }
    }

    const skip = (page - 1) * limit;

    const [notices, total] = await Promise.all([
      Notice.find(filter)
        .populate('createdBy', 'name email')
        .populate('departments', 'name')
        .populate('targetClasses', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notice.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      notices,
      totalPages,
      currentPage: parseInt(page),
      totalNotices: total
    });
  } catch (err) {
    console.error('Get all notices error:', err);
    res.status(500).json({ message: 'Failed to fetch notices' });
  }
};

// Get notice by ID
exports.getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findById(id)
      .populate('createdBy', 'name email')
      .populate('department', 'name')
      .populate('targetClasses', 'name');

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Check if user has access to this notice
    if (req.user.role === 'student') {
      const hasAccess = notice.targetAudience === 'All' ||
        notice.targetRoles.includes(req.user.role) ||
        notice.targetClasses.includes(req.user.class) ||
        notice.department.toString() === req.user.department.toString();
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Mark as read if not already read
    const alreadyRead = notice.readBy.some(read => 
      read.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      notice.readBy.push({
        user: req.user._id,
        readAt: Date.now()
      });
      notice.viewCount += 1;
      await notice.save();
    }

    res.json(notice);
  } catch (err) {
    console.error('Get notice by ID error:', err);
    res.status(500).json({ message: 'Failed to fetch notice' });
  }
};

// Update notice
exports.updateNotice = async (req, res) => {
  try {
    if (!['admin', 'departmentAdmin', 'faculty'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const updateData = req.body;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Only creator or admin can update
    if (notice.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only update notices you created' });
    }

    // If publishing for the first time
    if (updateData.isPublished && !notice.isPublished) {
      updateData.publishedAt = Date.now();
    }

    // Handle new file attachments
    const newAttachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const fileInfo = getFileInfo(file);
        if (fileInfo) {
          newAttachments.push({
            fileName: fileInfo.originalName,
            fileUrl: fileInfo.url,
            fileSize: fileInfo.size,
            fileType: fileInfo.mimetype
          });
        }
      });
    }

    const updatedNotice = await Notice.findByIdAndUpdate(
      id,
      {
        ...updateData,
        attachments: newAttachments.length > 0 ? [...notice.attachments, ...newAttachments] : notice.attachments
      },
      { new: true, runValidators: true }
    );

    // Send email notifications if notice is being published for the first time
    if (updatedNotice.isPublished && !updatedNotice.wasPublished) {
      try {
        await sendNoticeNotifications(updatedNotice);
      } catch (emailError) {
        console.error('Failed to send email notifications:', emailError);
      }
    }

    res.json({
      message: 'Notice updated successfully',
      notice: updatedNotice
    });
  } catch (err) {
    console.error('Update notice error:', err);
    res.status(500).json({ message: 'Failed to update notice' });
  }
};

// Delete notice
exports.deleteNotice = async (req, res) => {
  try {
    if (!['admin', 'departmentAdmin', 'faculty'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Only creator or admin can delete
    if (notice.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete notices you created' });
    }

    // Delete associated files
    if (notice.attachments && notice.attachments.length > 0) {
      notice.attachments.forEach(attachment => {
        const filePath = attachment.fileUrl.replace(process.env.BASE_URL || 'http://localhost:5000', '');
        deleteFile(filePath);
      });
    }

    await Notice.findByIdAndDelete(id);

    res.json({ message: 'Notice deleted successfully' });
  } catch (err) {
    console.error('Delete notice error:', err);
    res.status(500).json({ message: 'Failed to delete notice' });
  }
};

// Archive notice
exports.archiveNotice = async (req, res) => {
  try {
    if (!['admin', 'departmentAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;

    const notice = await Notice.findByIdAndUpdate(
      id,
      {
        isArchived: true,
        archivedAt: Date.now()
      },
      { new: true }
    );

    res.json({
      message: 'Notice archived successfully',
      notice
    });
  } catch (err) {
    console.error('Archive notice error:', err);
    res.status(500).json({ message: 'Failed to archive notice' });
  }
};

// Get notice analytics
exports.getNoticeAnalytics = async (req, res) => {
  try {
    if (!['admin', 'departmentAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { startDate, endDate } = req.query;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const departmentFilter = req.user.role === 'departmentAdmin' 
      ? { department: req.user.department } 
      : {};

    const analytics = await Notice.aggregate([
      { $match: { ...dateFilter, ...departmentFilter } },
      {
        $group: {
          _id: null,
          totalNotices: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          averageViews: { $avg: '$viewCount' },
          byCategory: {
            $push: {
              category: '$category',
              count: 1
            }
          },
          byPriority: {
            $push: {
              priority: '$priority',
              count: 1
            }
          }
        }
      }
    ]);

    res.json(analytics[0] || {
      totalNotices: 0,
      totalViews: 0,
      averageViews: 0,
      byCategory: [],
      byPriority: []
    });
  } catch (err) {
    console.error('Get notice analytics error:', err);
    res.status(500).json({ message: 'Failed to get notice statistics' });
  }
};

// Get unread notices count
exports.getUnreadCount = async (req, res) => {
  try {
    const lastReadDate = req.user.lastNoticeRead || new Date(0);
    
    const count = await Notice.countDocuments({
      createdAt: { $gt: lastReadDate },
      isPublished: true,
      $or: [
        { targetAudience: 'All' },
        { targetDepartments: req.user.department },
        { targetClasses: req.user.class },
        { targetRoles: req.user.role }
      ]
    });

    res.json({ unreadCount: count });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ message: 'Failed to get unread count' });
  }
};

// Mark notices as read
exports.markAsRead = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      lastNoticeRead: new Date()
    });

    res.json({ message: 'Notices marked as read' });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ message: 'Failed to mark notices as read' });
  }
};

// Get notice statistics
exports.getNoticeStats = async (req, res) => {
  try {
    const stats = await Notice.aggregate([
      {
        $group: {
          _id: null,
          totalNotices: { $sum: 1 },
          publishedNotices: {
            $sum: { $cond: ['$isPublished', 1, 0] }
          },
          draftNotices: {
            $sum: { $cond: ['$isPublished', 0, 1] }
          },
          totalViews: { $sum: '$viewCount' }
        }
      }
    ]);

    const categoryStats = await Notice.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Notice.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      overall: stats[0] || {
        totalNotices: 0,
        publishedNotices: 0,
        draftNotices: 0,
        totalViews: 0
      },
      byCategory: categoryStats,
      byPriority: priorityStats
    });
  } catch (err) {
    console.error('Get notice stats error:', err);
    res.status(500).json({ message: 'Failed to get notice statistics' });
  }
}; 