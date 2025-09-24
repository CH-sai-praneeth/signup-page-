const express = require('express');
const cors = require('cors');
require('dotenv').config();
const session = require('express-session');
const helmet = require('helmet');
const { initializeDatabase } = require('./src/config/database');
const oauthService = require('./src/services/oauthService');

initializeDatabase();

const app = express();
app.set('trust proxy', 1);

// Add helmet for basic security headers
app.use(helmet());

// Enable session middleware for storing OAuth state
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// ===========================
// 🔐 AUTHENTICATION MIDDLEWARE
// ===========================
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
    const decoded = oauthService.verifyJWT(token);
    
    const User = require('./src/models/User');
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

// ===========================
// 🏥 HEALTH CHECK ENDPOINTS
// ===========================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OAuth backend running!', 
    timestamp: new Date().toISOString(),
    port: PORT,
    version: '2.0.0',
    features: ['OAuth Authentication', 'Property APIs', 'Claims Processing']
  });
});

app.get('/ping', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date(),
    uptime: process.uptime(),
    message: 'Smart Claims API is running!',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===========================
// 🔑 OAUTH INITIATION ROUTES
// ===========================
app.get('/auth/google', (req, res) => {
  const state = oauthService.generateState();
  req.session.oauthState = state;
  const authUrl = oauthService.getGoogleAuthUrl(state);
  console.log('🔍 Redirecting to Google OAuth');
  res.redirect(authUrl);
});

app.get('/auth/facebook', (req, res) => {
  const state = oauthService.generateState();
  req.session.oauthState = state;
  const authUrl = oauthService.getFacebookAuthUrl(state);
  console.log('🔍 Redirecting to Facebook OAuth');
  res.redirect(authUrl);
});

app.get('/auth/github', (req, res) => {
  const state = oauthService.generateState();
  req.session.oauthState = state;
  const authUrl = oauthService.getGithubAuthUrl(state);
  console.log('🔍 Redirecting to GitHub OAuth');
  res.redirect(authUrl);
});

// ===========================
// 📞 OAUTH CALLBACKS (Direct to Claims)
// ===========================
app.get('/auth/google/callback', async (req, res) => {
  try {
    console.log('🔄 [GOOGLE CALLBACK] Processing...');
    const { code, error, state } = req.query;

    if (error) {
      console.error('❌ Google OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?error=google_error`);
    }

    if (!code) {
      console.error('❌ Missing authorization code');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?error=google_error`);
    }

    if (!state || state !== req.session?.oauthState) {
      console.error('❌ OAuth state mismatch');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?error=state_mismatch`);
    }

    console.log('🔑 Exchanging code for token...');
    const result = await oauthService.completeOAuthFlow('google', code);

    console.log('✅ OAuth successful for:', result.user?.email);
    
    // DIRECT REDIRECT TO CLAIMS PAGE
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?token=${result.token}`);
    
  } catch (err) {
    console.error('❌ [GOOGLE CALLBACK] Error:', err.message);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?error=oauth_failed`);
  }
});

app.get('/auth/facebook/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error || !code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?error=oauth_failed`);
    }
    
    const result = await oauthService.completeOAuthFlow('facebook', code);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?token=${result.token}`);
    
  } catch (error) {
    console.error('❌ Facebook OAuth error:', error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?error=oauth_failed`);
  }
});

app.get('/auth/github/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error || !code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?error=oauth_failed`);
    }
    
    const result = await oauthService.completeOAuthFlow('github', code);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?token=${result.token}`);
    
  } catch (error) {
    console.error('❌ GitHub OAuth error:', error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?error=oauth_failed`);
  }
});

// ===========================
// 👤 USER AUTHENTICATION ENDPOINTS
// ===========================
app.get('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const User = require('./src/models/User');
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'user_not_found' 
      });
    }
    
    res.json({ 
      success: true, 
      user: user.getPublicProfile() 
    });
  } catch (error) {
    console.error('❌ Profile fetch error:', error.message);
    res.status(401).json({ 
      success: false,
      error: 'profile_fetch_failed',
      message: error.message
    });
  }
});

app.post('/auth/logout', (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('❌ Session destruction error:', err);
        }
      });
    }
    
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

// ===========================
// 🏠 PROPERTY API ROUTES
// ===========================
const propertyDataService = require('./src/services/propertyDataService');

// Address suggestions
app.get('/api/property/address-suggestions', authenticateToken, async (req, res) => {
  try {
    const { input } = req.query;

    if (!input || input.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Input must be at least 3 characters long'
      });
    }

    const suggestions = await propertyDataService.getAddressSuggestions(input);

    res.json({
      success: true,
      suggestions: suggestions,
      count: suggestions.length
    });

  } catch (error) {
    console.error('❌ Address suggestions error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get address suggestions',
      message: error.message
    });
  }
});

// Property search
app.post('/api/property/search', authenticateToken, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || address.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    console.log(`🏠 Property search request: ${address}`);
    const result = await propertyDataService.searchAddressAndProperty(address);

    res.json({
      success: result.success,
      data: result.propertyData,
      suggestions: result.suggestions,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Property search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search property data',
      message: error.message
    });
  }
});

// Claims submission
app.post('/api/property/submit-claim', authenticateToken, async (req, res) => {
  try {
    const claimData = req.body;
    const userId = req.user?.userId;

    if (!claimData.address || !claimData.propertyDetails) {
      return res.status(400).json({
        success: false,
        error: 'Missing required claim data'
      });
    }

    const claimId = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    console.log(`✅ Claim submitted successfully: ${claimId}`);

    res.json({
      success: true,
      claimId: claimId,
      message: 'Claim submitted successfully',
      estimatedProcessingTime: '30 minutes',
      nextSteps: [
        'AI analysis will begin immediately',
        'You will receive an email update within 30 minutes',
        'Detailed report will be available in your dashboard'
      ]
    });

  } catch (error) {
    console.error('❌ Claim submission error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to submit claim',
      message: error.message
    });
  }
});

// API health check
app.get('/api/property/health', async (req, res) => {
  try {
    const healthStatus = await propertyDataService.getAPIHealthStatus();
    
    const overallHealthy = Object.values(healthStatus.services).every(
      service => service.status === 'healthy'
    );

    res.status(overallHealthy ? 200 : 503).json({
      success: true,
      overall_status: overallHealthy ? 'healthy' : 'degraded',
      ...healthStatus
    });

  } catch (error) {
    console.error('❌ Health check error:', error.message);
    res.status(500).json({
      success: false,
      overall_status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===========================
// 📚 API DOCUMENTATION
// ===========================
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Smart Claims API Documentation',
    version: '2.0.0',
    description: 'API for OAuth authentication and property data services',
    endpoints: {
      authentication: {
        'GET /auth/google': 'Initiate Google OAuth flow',
        'GET /auth/facebook': 'Initiate Facebook OAuth flow', 
        'GET /auth/github': 'Initiate GitHub OAuth flow',
        'GET /auth/profile': 'Get current user profile (requires Bearer token)',
        'POST /auth/logout': 'Logout current user'
      },
      property: {
        'GET /api/property/address-suggestions?input=<address>': 'Get address suggestions',
        'POST /api/property/search': 'Search for property data',
        'GET /api/property/health': 'Check API health status',
        'POST /api/property/submit-claim': 'Submit insurance claim'
      },
      utility: {
        'GET /health': 'Basic health check',
        'GET /ping': 'Server status check',
        'GET /api/docs': 'This documentation'
      }
    }
  });
});

// ===========================
// ❌ ERROR HANDLING
// ===========================
app.use((err, req, res, next) => {
  console.error('❌ Unhandled server error:', err.stack);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong on our end',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
  });
});

// ===========================
// 🚀 START SERVER
// ===========================
app.listen(PORT, () => {
  console.log('\n🚀 Smart Claims Backend Server Started!');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📋 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('\n✅ Features Available:');
  console.log('  🔐 OAuth Authentication (Google, Facebook, GitHub)');
  console.log('  🏠 Property Data APIs');
  console.log('  📸 Claims Processing');
  console.log('  📊 Health Monitoring');
  console.log('\n🔗 Frontend Integration:');
  console.log(`  Direct redirect after OAuth to: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims`);
  console.log('');
});