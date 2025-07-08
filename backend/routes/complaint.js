const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const auth = require('../middlewares/auth');
const { uploadConfigs, handleUploadError } = require('../middlewares/upload');
const upload = require('multer')();

// All routes require authentication
router.use(auth);

// Complaint CRUD operations
// router.post('/submit', complaintController.submitComplaint);
router.get('/all', complaintController.getComplaints);
router.get('/:id', complaintController.getComplaintById);
router.delete('/:id', complaintController.deleteComplaint);

// Complaint management
router.put('/status/:id', complaintController.updateComplaintStatus);
router.post('/note/:id', complaintController.addInternalNote);
router.post('/response/:id', complaintController.addResponse);
router.put('/escalate/:id', complaintController.escalateComplaint);
router.post('/rate/:id', complaintController.rateComplaint);

// Analytics and search
router.get('/analytics', complaintController.getComplaintAnalytics);
router.get('/search/tracking', complaintController.searchByTrackingNumber);

router.post('/', uploadConfigs.complaintAttachments, handleUploadError, complaintController.createComplaint);
router.get('/', complaintController.getComplaints);
router.put('/:id/status', complaintController.updateComplaintStatus);
router.put('/:id', auth, upload.array('images'), complaintController.updateComplaint);

module.exports = router; 