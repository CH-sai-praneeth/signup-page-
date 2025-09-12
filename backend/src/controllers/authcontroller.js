const oauthService = require('../services/oauthService');
const User = require('../models/User');

/**
 * Auth Controller Class - Handles all authentication requests
 */
class AuthController {

  // ===========================
  // 🚀 OAUTH INITIATION (Start OAuth Flow)
  // ===========================

  /**
   * Initiate Google OAuth flow
   */
  async initiateGoogleAuth(req, res) {
    try {
      console.log('🔵 Starting Google OAuth initiation');
      
      // Generate secure state for CSRF protection
      const state = oauthService.generateState();
      
      // Store state in session (you can use Redis/database in production)
      req.session = req.session || {};
      req.session.oauthState = state;
      req.session.oauthProvider = 'google';
      
      // Get Google authorization URL
      const authUrl = oauthService.getGoogleAuthUrl(state);
      
      console.log('🔄 Redirecting to Google OAuth');
      res.redirect(authUrl);
      
    } catch (error) {
      console.error('❌ Google OAuth initiation error:', error.message);
      this.handleOAuthError(res, 'google_initiation_failed', error.message);
    }
  }

  /**
   * Initiate Facebook OAuth flow
   */
  async initiateFacebookAuth(req, res) {
    try {
      console.log('🟦 Starting Facebook OAuth initiation');
      
      const state = oauthService.generateState();
      
      req.session = req.session || {};
      req.session.oauthState = state;
      req.session.oauthProvider = 'facebook';
      
      const authUrl = oauthService.getFacebookAuthUrl(state);
      
      console.log('🔄 Redirecting to Facebook OAuth');
      res.redirect(authUrl);
      
    } catch (error) {
      console.error('❌ Facebook OAuth initiation error:', error.message);
      this.handleOAuthError(res, 'facebook_initiation_failed', error.message);
    }
  }

  /**
   * Initiate GitHub OAuth flow
   */
  async initiateGithubAuth(req, res) {
    try {
      console.log('⚫ Starting GitHub OAuth initiation');
      
      const state = oauthService.generateState();
      
      req.session = req.session || {};
      req.session.oauthState = state;
      req.session.oauthProvider = 'github';
      
      const authUrl = oauthService.getGithubAuthUrl(state);
      
      console.log('🔄 Redirecting to GitHub OAuth');
      res.redirect(authUrl);
      
    } catch (error) {
      console.error('❌ GitHub OAuth initiation error:', error.message);
      this.handleOAuthError(res, 'github_initiation_failed', error.message);
    }
  }

  // ===========================
  // 📞 OAUTH CALLBACKS (Handle OAuth Responses)
  // ===========================

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(req, res) {
    try {
      console.log('🔵 Google OAuth callback received');
      
      const { code, state, error } = req.query;
      
      // Handle OAuth errors from Google
      if (error) {
        console.error('❌ Google OAuth error:', error);
        return this.redirectToFrontendWithError(res, 'google_oauth_denied');
      }
      
      // Validate required parameters
      if (!code) {
        console.error('❌ Missing authorization code from Google');
        return this.redirectToFrontendWithError(res, 'missing_authorization_code');
      }
      
      // Validate state parameter (CSRF protection)
      if (!this.validateState(req, state)) {
        console.error('❌ Invalid state parameter');
        return this.redirectToFrontendWithError(res, 'invalid_state');
      }
      
      // Complete OAuth flow
      const result = await oauthService.completeOAuthFlow('google', code);
      
      console.log('✅ Google OAuth completed for:', result.user.email);
      
      // Redirect to frontend with success
      this.redirectToFrontendWithSuccess(res, result.token, result.userProfile);
      
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error.message);
      this.redirectToFrontendWithError(res, 'google_oauth_failed');
    }
  }

  /**
   * Handle Facebook OAuth callback
   */
  async handleFacebookCallback(req, res) {
    try {
      console.log('🟦 Facebook OAuth callback received');
      
      const { code, state, error } = req.query;
      
      if (error) {
        console.error('❌ Facebook OAuth error:', error);
        return this.redirectToFrontendWithError(res, 'facebook_oauth_denied');
      }
      
      if (!code) {
        console.error('❌ Missing authorization code from Facebook');
        return this.redirectToFrontendWithError(res, 'missing_authorization_code');
      }
      
      if (!this.validateState(req, state)) {
        console.error('❌ Invalid state parameter');
        return this.redirectToFrontendWithError(res, 'invalid_state');
      }
      
      const result = await oauthService.completeOAuthFlow('facebook', code);
      
      console.log('✅ Facebook OAuth completed for:', result.user.email);
      
      this.redirectToFrontendWithSuccess(res, result.token, result.userProfile);
      
    } catch (error) {
      console.error('❌ Facebook OAuth callback error:', error.message);
      this.redirectToFrontendWithError(res, 'facebook_oauth_failed');
    }
  }

  /**
   * Handle GitHub OAuth callback
   */
  async handleGithubCallback(req, res) {
    try {
      console.log('⚫ GitHub OAuth callback received');
      
      const { code, state, error } = req.query;
      
      if (error) {
        console.error('❌ GitHub OAuth error:', error);
        return this.redirectToFrontendWithError(res, 'github_oauth_denied');
      }
      
      if (!code) {
        console.error('❌ Missing authorization code from GitHub');
        return this.redirectToFrontendWithError(res, 'missing_authorization_code');
      }
      
      if (!this.validateState(req, state)) {
        console.error('❌ Invalid state parameter');
        return this.redirectToFrontendWithError(res, 'invalid_state');
      }
      
      const result = await oauthService.completeOAuthFlow('github', code);
      
      console.log('✅ GitHub OAuth completed for:', result.user.email);
      
      this.redirectToFrontendWithSuccess(res, result.token, result.userProfile);
      
    } catch (error) {
      console.error('❌ GitHub OAuth callback error:', error.message);
      this.redirectToFrontendWithError(res, 'github_oauth_failed');
    }
  }

  // ===========================
  // 👤 USER MANAGEMENT ENDPOINTS
  // ===========================

  /**
   * Get current user profile (protected endpoint)
   */
  async getUserProfile(req, res) {
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
  }

  /**
   * Logout user (invalidate token)
   */
  async logout(req, res) {
    try {
      // Clear session if exists
      if (req.session) {
        req.session.destroy();
      }
      
      // In production, you might want to blacklist the token
      // For now, we just rely on frontend to delete the token
      
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
  }

  /**
   * Get user statistics (admin endpoint)
   */
  async getUserStats(req, res) {
    try {
      const stats = await User.getStats();
      
      res.json({
        success: true,
        stats: stats
      });
      
    } catch (error) {
      console.error('❌ Get stats error:', error.message);
      res.status(500).json({
        success: false,
        error: 'stats_failed',
        message: 'Failed to get user statistics'
      });
    }
  }

  // ===========================
  // 🛠️ HELPER METHODS
  // ===========================

  /**
   * Validate OAuth state parameter (CSRF protection)
   */
  validateState(req, receivedState) {
    const sessionState = req.session?.oauthState;
    
    if (!sessionState || !receivedState) {
      return false;
    }
    
    return sessionState === receivedState;
  }

  /**
   * Redirect to frontend with success
   */
  redirectToFrontendWithSuccess(res, token, userProfile) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${frontendUrl}/auth-success?token=${encodeURIComponent(token)}`;
    
    console.log('✅ Redirecting to frontend with success');
    res.redirect(successUrl);
  }

  /**
   * Redirect to frontend with error
   */
  redirectToFrontendWithError(res, errorCode, errorMessage = '') {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const errorUrl = `${frontendUrl}/login?error=${errorCode}`;
    
    console.log('❌ Redirecting to frontend with error:', errorCode);
    res.redirect(errorUrl);
  }

  /**
   * Handle OAuth errors (for initiation failures)
   */
  handleOAuthError(res, errorCode, errorMessage) {
    res.status(500).json({
      success: false,
      error: errorCode,
      message: errorMessage || 'OAuth initiation failed'
    });
  }

  // ===========================
  // ❤️ HEALTH CHECK
  // ===========================

  /**
   * Health check for auth system
   */
  async healthCheck(req, res) {
    try {
      // Check database connection
      const userCount = await User.countDocuments();
      
      // Check environment variables
      const hasGoogleCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      const hasFacebookCredentials = !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
      const hasGithubCredentials = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
      const hasJwtSecret = !!process.env.JWT_SECRET;
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          userCount: userCount
        },
        oauth: {
          google: hasGoogleCredentials,
          facebook: hasFacebookCredentials,
          github: hasGithubCredentials
        },
        jwt: {
          configured: hasJwtSecret
        }
      });
      
    } catch (error) {
      console.error('❌ Health check error:', error.message);
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

// ===========================
// 📤 EXPORT CONTROLLER
// ===========================

// Export single instance
module.exports = new AuthController();
