const express = require('express');
const router = express.Router();
const multer = require('multer');
const simpleDocumentController = require('../controllers/simpleDocumentController');

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'missing_token',
        message: 'Authorization token required' 
      });
    }
    
    const token = authHeader.substring(7);
    const oauthService = require('../services/oauthService');
    const decoded = oauthService.verifyJWT(token);
    
    const User = require('../models/User');
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        error: 'user_not_found',
        message: 'User account not found or inactive' 
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: 'invalid_token',
      message: error.message 
    });
  }
};

// PDF parsing route
router.post(
  '/parse-pdf',
  authenticateToken,
  upload.single('document'),
  simpleDocumentController.extractAndParsePDF
);

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next(error);
});

module.exports = router;