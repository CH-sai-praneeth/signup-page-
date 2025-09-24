const axios = require('axios');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * OAuth Service Class - Handles all OAuth and JWT operations
 */
class OAuthService {

  // ===========================
  // 🔐 JWT TOKEN METHODS
  // ===========================

  /**
   * Generate JWT token for user
   */
  generateJWT(user) {
    try {
      const payload = {
        userId: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        providers: user.getProviders(),
        iat: Math.floor(Date.now() / 1000) // Issued at time
      };

      const options = {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'oauth-backend',
        audience: 'oauth-frontend'
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, options);
      
      console.log('✅ JWT token generated for user:', user.email);
      return token;
      
    } catch (error) {
      console.error('❌ JWT generation error:', error.message);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Verify JWT token
   */
  verifyJWT(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ JWT token verified for user:', decoded.email);
      return decoded;
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  // ===========================
  // 🎲 SECURITY HELPERS
  // ===========================

  /**
   * Generate random state for OAuth security
   */
  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure random string
   */
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // ===========================
  // 🔗 OAUTH URL BUILDERS
  // ===========================

  /**
   * Build Google OAuth URL
   */
  getGoogleAuthUrl(state) {
    const baseUrl = process.env.BASE_URL || process.env.BACKEND_URL || 'https://signup-page-b4tb.onrender.com';
    
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: `${baseUrl}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      state: state,
      prompt: 'select_account' // Force account selection
    });

    return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
  }

  /**
   * Build Facebook OAuth URL
   */
  getFacebookAuthUrl(state) {
    const baseUrl = process.env.BASE_URL || process.env.BACKEND_URL || 'https://signup-page-b4tb.onrender.com';
    
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_CLIENT_ID,
      redirect_uri: `${baseUrl}/auth/facebook/callback`,
      response_type: 'code',
      scope: 'email,public_profile',
      state: state
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Build GitHub OAuth URL
   */
  getGithubAuthUrl(state) {
    const baseUrl = process.env.BASE_URL || process.env.BACKEND_URL || 'https://signup-page-b4tb.onrender.com';
    
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: `${baseUrl}/auth/github/callback`,
      response_type: 'code',
      scope: 'user:email',
      state: state
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  // ===========================
  // 🔄 OAUTH TOKEN EXCHANGE
  // ===========================

  /**
   * Exchange Google OAuth code for access token
   */
  async exchangeGoogleCode(code) {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
      
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${baseUrl}/auth/google/callback`
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Google token exchange successful');
      return response.data;
      
    } catch (error) {
      console.error('❌ Google token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange Google authorization code');
    }
  }

  /**
   * Exchange Facebook OAuth code for access token
   */
  async exchangeFacebookCode(code) {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
      
      const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_CLIENT_ID,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET,
        code: code,
        redirect_uri: `${baseUrl}/auth/facebook/callback`
      });

      const response = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`);

      console.log('✅ Facebook token exchange successful');
      return response.data;
      
    } catch (error) {
      console.error('❌ Facebook token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange Facebook authorization code');
    }
  }

  /**
   * Exchange GitHub OAuth code for access token
   */
  async exchangeGithubCode(code) {
    try {
      const response = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ GitHub token exchange successful');
      return response.data;
      
    } catch (error) {
      console.error('❌ GitHub token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange GitHub authorization code');
    }
  }

  // ===========================
  // 👤 GET USER INFO FROM OAUTH
  // ===========================

  /**
   * Get user info from Google
   */
  async getGoogleUserInfo(accessToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const userData = response.data;
      
      return {
        provider: 'google',
        providerId: userData.id,
        email: userData.email,
        name: userData.name,
        avatar: userData.picture || ''
      };
      
    } catch (error) {
      console.error('❌ Google user info error:', error.response?.data || error.message);
      throw new Error('Failed to get Google user information');
    }
  }

  /**
   * Get user info from Facebook
   */
  async getFacebookUserInfo(accessToken) {
    try {
      const response = await axios.get('https://graph.facebook.com/me', {
        params: {
          fields: 'id,name,email,picture.type(large)',
          access_token: accessToken
        }
      });

      const userData = response.data;
      
      return {
        provider: 'facebook',
        providerId: userData.id,
        email: userData.email,
        name: userData.name,
        avatar: userData.picture?.data?.url || ''
      };
      
    } catch (error) {
      console.error('❌ Facebook user info error:', error.response?.data || error.message);
      throw new Error('Failed to get Facebook user information');
    }
  }

  /**
   * Get user info from GitHub
   */
  async getGithubUserInfo(accessToken) {
    try {
      // Get user profile
      const profileResponse = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'User-Agent': 'OAuth-Backend-App'
        }
      });

      // Get user emails
      const emailResponse = await axios.get('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'User-Agent': 'OAuth-Backend-App'
        }
      });

      const userData = profileResponse.data;
      const emails = emailResponse.data;
      const primaryEmail = emails.find(email => email.primary)?.email || emails[0]?.email;
      
      return {
        provider: 'github',
        providerId: userData.id.toString(),
        email: primaryEmail,
        name: userData.name || userData.login,
        avatar: userData.avatar_url || ''
      };
      
    } catch (error) {
      console.error('❌ GitHub user info error:', error.response?.data || error.message);
      throw new Error('Failed to get GitHub user information');
    }
  }

  // ===========================
  // 👥 USER MANAGEMENT
  // ===========================

  /**
   * Find or create user from OAuth data
   */
  async findOrCreateUser(oauthUserData) {
    try {
      console.log(`🔍 Looking for user: ${oauthUserData.email} (${oauthUserData.provider})`);
      
      // First, try to find user by provider ID
      let user = await User.findByProvider(oauthUserData.provider, oauthUserData.providerId);
      
      if (user) {
        console.log('✅ Found existing user by provider');
        user.updateLoginInfo();
        await user.save();
        return user;
      }

      // Then, try to find by email (user might have used different provider before)
      user = await User.findByEmail(oauthUserData.email);
      
      if (user) {
        console.log('✅ Found existing user by email, adding new provider');
        user.addProvider(oauthUserData.provider, oauthUserData.providerId);
        user.updateLoginInfo();
        await user.save();
        return user;
      }

      // Create new user
      console.log('👤 Creating new user');
      user = await User.createFromOAuth(oauthUserData);
      console.log('✅ New user created successfully');
      
      return user;
      
    } catch (error) {
      console.error('❌ User creation/update error:', error.message);
      throw new Error('Failed to process user data');
    }
  }

  /**
   * Complete OAuth flow - from code to JWT token
   */
  async completeOAuthFlow(provider, code) {
    try {
      console.log(`🔄 Starting ${provider} OAuth flow`);
      
      // Step 1: Exchange code for access token
      let tokenData;
      switch (provider) {
        case 'google':
          tokenData = await this.exchangeGoogleCode(code);
          break;
        case 'facebook':
          tokenData = await this.exchangeFacebookCode(code);
          break;
        case 'github':
          tokenData = await this.exchangeGithubCode(code);
          break;
        default:
          throw new Error(`Unsupported OAuth provider: ${provider}`);
      }

      // Step 2: Get user info from provider
      let userInfo;
      switch (provider) {
        case 'google':
          userInfo = await this.getGoogleUserInfo(tokenData.access_token);
          break;
        case 'facebook':
          userInfo = await this.getFacebookUserInfo(tokenData.access_token);
          break;
        case 'github':
          userInfo = await this.getGithubUserInfo(tokenData.access_token);
          break;
      }

      // Step 3: Find or create user
      const user = await this.findOrCreateUser(userInfo);

      // Step 4: Generate JWT token
      const jwtToken = this.generateJWT(user);

      console.log(`✅ ${provider} OAuth flow completed for user: ${user.email}`);
      
      return {
        user: user,
        token: jwtToken,
        userProfile: user.getPublicProfile()
      };
      
    } catch (error) {
      console.error(`${provider} OAuth flow error:`, error.message);
      throw error;
    }
  }
}

// ===========================
// 📤 EXPORT SERVICE
// ===========================

// Export single instance (singleton pattern)
module.exports = new OAuthService();