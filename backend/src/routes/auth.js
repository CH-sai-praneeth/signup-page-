const express = require('express');
const router = express.Router();
const oauthService = require('../services/oauthService');

/**
 * Auth Routes - Basic authentication endpoints
 */

// Get current user profile (protected endpoint)
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'missing_token',
        message: 'Authorization token required'
      });
    }
    
    // Extract token
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = oauthService.verifyJWT(token);
    
    // Get fresh user data from database
    const User = require('../models/User');
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'user_not_found',
        message: 'User account not found or inactive'
      });
    }
    
    // Return user profile
    res.json({
      success: true,
      user: user.getPublicProfile()
    });
    
  } catch (error) {
    console.error('❌ Get profile error:', error.message);
    
    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        error: 'token_expired',
        message: 'Authentication token has expired'
      });
    }
    
    res.status(401).json({
      success: false,
      error: 'invalid_token',
      message: 'Invalid authentication token'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  try {
    // In a more complex setup, you might invalidate the token here
    // For now, we just return success and let frontend handle token removal
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('❌ Logout error:', error.message);
    res.status(500).json({
      success: false,
      error: 'logout_failed',
      message: 'Failed to logout'
    });
  }
});

module.exports = router;
