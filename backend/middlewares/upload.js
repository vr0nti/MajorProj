const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;
    
    // Create subdirectories based on file type
    if (file.fieldname === 'notice_attachment') {
      uploadPath = path.join(uploadsDir, 'notices');
    } else if (file.fieldname === 'complaint_attachment') {
      uploadPath = path.join(uploadsDir, 'complaints');
    } else if (file.fieldname === 'chat_file') {
      uploadPath = path.join(uploadsDir, 'chat');
    } else if (file.fieldname === 'profile_image') {
      uploadPath = path.join(uploadsDir, 'profiles');
    } else if (file.fieldname === 'assignment_file') {
      uploadPath = path.join(uploadsDir, 'assignments');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    // Sanitize filename
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    'image': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    'spreadsheet': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'presentation': ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    'archive': ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
  };

  // Check if file type is allowed
  const isAllowed = Object.values(allowedTypes).flat().includes(file.mimetype);
  
  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, spreadsheets, presentations, and archives are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  }
});

// Specific upload configurations
const uploadConfigs = {
  // Single file uploads
  single: (fieldName) => upload.single(fieldName),
  
  // Multiple files uploads
  array: (fieldName, maxCount) => upload.array(fieldName, maxCount || 5),
  
  // Multiple fields with different file counts
  fields: (fields) => upload.fields(fields),
  
  // Notice attachments
  noticeAttachments: upload.array('files', 5),
  
  // Complaint attachments
  complaintAttachments: upload.array('images', 3),
  
  // Chat files
  chatFiles: upload.single('chat_file'),
  
  // Profile images
  profileImage: upload.single('profile_image'),
  
  // Assignment files
  assignmentFiles: upload.array('assignment_file', 10)
};

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  console.log(error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum file size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files. Maximum 5 files allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Unexpected file field.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      message: error.message
    });
  }
  
  next(error);
};

// Helper function to get file URL
const getFileUrl = (filename, type = 'general') => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/uploads/${type}/${filename}`;
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper function to get file info
const getFileInfo = (file) => {
  if (!file) return null;
  
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: getFileUrl(file.filename, getFileType(file.fieldname))
  };
};

// Helper function to get file type from fieldname
const getFileType = (fieldname) => {
  if (fieldname === 'notice_attachment') return 'notices';
  if (fieldname === 'complaint_attachment') return 'complaints';
  if (fieldname === 'chat_file') return 'chat';
  if (fieldname === 'profile_image') return 'profiles';
  if (fieldname === 'assignment_file') return 'assignments';
  return 'general';
};

module.exports = {
  upload,
  uploadConfigs,
  handleUploadError,
  getFileUrl,
  deleteFile,
  getFileInfo
}; 