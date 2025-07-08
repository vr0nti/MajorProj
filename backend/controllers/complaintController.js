const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Department = require('../models/Department');
const path = require('path');

// Submit complaint
// exports.submitComplaint = async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       category,
//       priority,
//       against,
//       isAnonymous,
//       attachments
//     } = req.body;

//     const complaint = new Complaint({
//       complainant: req.user._id,
//       title,
//       description,
//       category,
//       priority,
//       against,
//       isAnonymous,
//       department: req.user.department,
//       attachments
//     });

//     await complaint.save();

//     // Auto-assign to department admin if available
//     const departmentAdmin = await User.findOne({
//       role: 'departmentAdmin',
//       department: req.user.department
//     });

//     if (departmentAdmin) {
//       complaint.assignedTo = departmentAdmin._id;
//       await complaint.save();
//     }

//     res.status(201).json({
//       message: 'Complaint submitted successfully',
//       complaint,
//       trackingNumber: complaint.trackingNumber
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// Get complaints (filtered by user role)
exports.getComplaints = async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user._id;
    const filter = {
      $or: [
        { createdBy: userId },
        { recipients: req.user.role }
      ]
    };
    if (status) filter.status = status;
    const complaints = await Complaint.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get complaint by ID
exports.getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id)
      .populate('createdBy', 'name email role')
      .populate('against', 'name email role')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('internalNotes.addedBy', 'name')
      .populate('responses.respondedBy', 'name');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check access permissions
    if (req.user.role === 'student' || req.user.role === 'faculty') {
      if (complaint.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'departmentAdmin') {
      if (complaint.department.toString() !== req.user.department.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update complaint status
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    // Only recipients can update status
    if (!complaint.recipients.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update status' });
    }
    complaint.status = status;
    complaint.statusHistory.push({ status, updatedBy: req.user.role });
    await complaint.save();
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add internal note
exports.addInternalNote = async (req, res) => {
  try {
    if (!['admin', 'departmentAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { note } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check department access
    if (req.user.role === 'departmentAdmin' && 
        complaint.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    complaint.internalNotes.push({
      note,
      addedBy: req.user._id
    });

    await complaint.save();

    res.json({
      message: 'Internal note added successfully',
      complaint
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add response
exports.addResponse = async (req, res) => {
  try {
    if (!['admin', 'departmentAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { response } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check department access
    if (req.user.role === 'departmentAdmin' && 
        complaint.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    complaint.responses.push({
      response,
      respondedBy: req.user._id
    });

    // Update status to In Progress if it was Open
    if (complaint.status === 'Open') {
      complaint.status = 'In Progress';
    }

    await complaint.save();

    res.json({
      message: 'Response added successfully',
      complaint
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Escalate complaint
exports.escalateComplaint = async (req, res) => {
  try {
    if (!['admin', 'departmentAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { escalatedTo } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check department access
    if (req.user.role === 'departmentAdmin' && 
        complaint.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    complaint.escalatedTo = escalatedTo;
    complaint.escalatedAt = Date.now();
    complaint.status = 'Under Review';

    await complaint.save();

    res.json({
      message: 'Complaint escalated successfully',
      complaint
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Rate complaint resolution
exports.rateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { satisfactionRating, satisfactionComment } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Only complainant can rate
    if (complaint.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only complainant can rate the resolution' });
    }

    // Only resolved complaints can be rated
    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ message: 'Only resolved complaints can be rated' });
    }

    complaint.satisfactionRating = satisfactionRating;
    complaint.satisfactionComment = satisfactionComment;

    await complaint.save();

    res.json({
      message: 'Complaint rated successfully',
      complaint
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get complaint analytics
exports.getComplaintAnalytics = async (req, res) => {
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

    const analytics = await Complaint.aggregate([
      { $match: { ...dateFilter, ...departmentFilter } },
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          averageResolutionTime: { $avg: '$resolutionTime' },
          byStatus: {
            $push: {
              status: '$status',
              count: 1
            }
          },
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
          },
          averageSatisfaction: { $avg: '$satisfactionRating' }
        }
      }
    ]);

    res.json(analytics[0] || {
      totalComplaints: 0,
      averageResolutionTime: 0,
      byStatus: [],
      byCategory: [],
      byPriority: [],
      averageSatisfaction: 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Search complaints by tracking number
exports.searchByTrackingNumber = async (req, res) => {
  try {
    const { trackingNumber } = req.query;

    if (!trackingNumber) {
      return res.status(400).json({ message: 'Tracking number is required' });
    }

    const complaint = await Complaint.findOne({ trackingNumber })
      .populate('createdBy', 'name email role')
      .populate('against', 'name email role')
      .populate('assignedTo', 'name email')
      .populate('department', 'name');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check access permissions
    if (req.user.role === 'student' || req.user.role === 'faculty') {
      if (complaint.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'departmentAdmin') {
      if (complaint.department.toString() !== req.user.department.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createComplaint = async (req, res) => {
  try {
    const { title, description, recipients, category } = req.body;
    let images = [];
    if (req.files) {
      images = req.files.map(f => '/uploads/' + path.basename(f.path));
    }
    const complaint = await Complaint.create({
      title,
      description,
      category,
      createdBy: req.user._id,
      recipients,
      images,
      status: 'open',
      statusHistory: [{ status: 'open', updatedBy: req.user.role }]
    });
    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, recipients, category } = req.body;
    let images = [];
    if (req.files) {
      images = req.files.map(f => '/uploads/' + path.basename(f.path));
    }
    const complaint = await Complaint.findById(id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (complaint.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this complaint' });
    }
    complaint.title = title;
    complaint.description = description;
    complaint.category = category;
    complaint.recipients = recipients;
    if (images.length > 0) complaint.images = images;
    complaint.statusHistory.push({ status: complaint.status, updatedBy: req.user.role });
    await complaint.save();
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 

exports.deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    await Complaint.findByIdAndDelete(id);
    res.json({ message: 'Complaint deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};