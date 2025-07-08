const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { uploadConfigs, handleUploadError } = require('../middlewares/upload');
const {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  archiveNotice,
  getUnreadCount,
  markAsRead,
  getNoticeStats
} = require('../controllers/noticeController');
const noticeController = require('../controllers/noticeController');
const upload = require('../middlewares/upload');

// All routes require authentication
router.use(auth);

// Create notice with file upload
router.post('/create', uploadConfigs.noticeAttachments, handleUploadError, createNotice);

// Get all notices with filtering and pagination
router.get('/all', getAllNotices);

// Get a single notice by ID
router.get('/:id', getNoticeById);

// Update notice with file upload
router.put('/update/:id', uploadConfigs.noticeAttachments, handleUploadError, updateNotice);

// Delete notice
router.delete('/delete/:id', deleteNotice);

// Archive notice
router.put('/archive/:id', archiveNotice);

// Get unread count
router.get('/unread/count', getUnreadCount);

// Mark notices as read
router.put('/mark-read', markAsRead);

// Get notice statistics
router.get('/stats/overview', getNoticeStats);

// Add notice (admin, departmentAdmin, classTeacher)
router.post('/', auth, uploadConfigs.noticeAttachments, handleUploadError, createNotice);

module.exports = router; 