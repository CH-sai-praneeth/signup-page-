const express = require('express');
const cors = require('cors');
require('dotenv').config();
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeDatabase } = require('./src/config/database');
const oauthService = require('./src/services/oauthService');

// Import routes
const authRoutes = require('./src/routes/auth');
const propertyRoutes = require('./src/routes/propertyRoutes');

initializeDatabase();

const app = express();
app.set('trust proxy', 1); // important for Render / Vercel proxying

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
    'http://localhost:3000',
    'https://your-frontend-domain.com' // Add your production frontend URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// API-specific rate limiting for property endpoints
const propertyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 API calls per windowMs
  message: {
    error: 'Too many API requests, please try again later.'
  }
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Health check endpoints
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

// OAuth initiation routes
app.get('/auth/google', (req, res) => {
  const state = oauthService.generateState();
  req.session.oauthState = state;
  const authUrl = oauthService.getGoogleAuthUrl(state);
  console.log('🔍 BASE_URL from env:', process.env.BASE_URL);
  console.log('🔍 Generated Google OAuth URL:', authUrl);
  console.log('Redirecting to Google OAuth');
  res.redirect(authUrl);
});

app.get('/auth/facebook', (req, res) => {
  const state = oauthService.generateState();
  req.session.oauthState = state;
  const authUrl = oauthService.getFacebookAuthUrl(state);
  console.log('Redirecting to Facebook OAuth');
  res.redirect(authUrl);
});

app.get('/auth/github', (req, res) => {
  const state = oauthService.generateState();
  req.session.oauthState = state;
  const authUrl = oauthService.getGithubAuthUrl(state);
  console.log('Redirecting to GitHub OAuth');
  res.redirect(authUrl);
});

// OAuth callbacks with direct redirect to claims page
app.get('/auth/google/callback', async (req, res) => {
  try {
    console.log('🔄 [GOOGLE CALLBACK] Hit');
    console.log('📥 Query Params:', req.query);
    console.log('📦 Session State:', req.session?.oauthState);

    const { code, error, state } = req.query;

    if (error) {
      console.error('❌ Google returned an error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?error=google_error`);
    }

    if (!code) {
      console.error('❌ Missing authorization code in callback');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?error=missing_code`);
    }

    if (!state || state !== req.session?.oauthState) {
      console.error('❌ OAuth state mismatch!');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?error=state_mismatch`);
    }

    console.log('🔑 Exchanging authorization code for tokens...');
    const result = await oauthService.completeOAuthFlow('google', code);

    console.log('✅ OAuth Exchange Successful!');
    console.log('👤 Authenticated User:', result.user?.email);

    // Direct redirect to claims page with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?token=${result.token}`);
    
  } catch (err) {
    console.error('❌ [GOOGLE CALLBACK] Uncaught error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?error=oauth_failed`);
  }
});

app.get('/auth/facebook/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error || !code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?error=oauth_failed`);
    }
    
    const result = await oauthService.completeOAuthFlow('facebook', code);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?token=${result.token}`);
    
  } catch (error) {
    console.error('Facebook OAuth error:', error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?error=oauth_failed`);
  }
});

app.get('/auth/github/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error || !code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?error=oauth_failed`);
    }
    
    const result = await oauthService.completeOAuthFlow('github', code);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims?token=${result.token}`);
    
  } catch (error) {
    console.error('GitHub OAuth error:', error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?error=oauth_failed`);
  }
});

// Authentication routes
app.use('/auth', authRoutes);

// Property API routes with rate limiting
app.use('/api/property', propertyLimiter, propertyRoutes);

// User profile endpoint
app.get('/auth/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
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
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'user_not_found',
        message: 'User account not found'
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
      error: 'invalid_token',
      message: error.message
    });
  }
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  try {
    // Clear session if exists
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
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

// API documentation endpoint
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
        'GET /api/property/data/:address': 'Get detailed property information',
        'GET /api/property/health': 'Check API health status',
        'POST /api/property/submit-claim': 'Submit insurance claim',
        'GET /api/property/claims': 'Get user claim history',
        'GET /api/property/claim/:claimId': 'Get specific claim details'
      },
      utility: {
        'GET /health': 'Basic health check',
        'GET /ping': 'Server status check',
        'GET /api/docs': 'This documentation'
      }
    },
    authentication: {
      type: 'Bearer Token',
      description: 'Include Authorization: Bearer <token> in request headers for protected endpoints'
    },
    rate_limits: {
      general: '100 requests per 15 minutes',
      property_api: '50 requests per 15 minutes'
    }
  });
});

// Development route for testing (remove in production)
if (process.env.NODE_ENV === 'development') {
  app.get('/dev/test-token', (req, res) => {
    // Generate a test token for development
    const testUser = {
      _id: 'dev-user-123',
      email: 'dev@test.com',
      name: 'Development User',
      avatar: 'https://via.placeholder.com/64'
    };
    
    const testToken = oauthService.generateJWT(testUser);
    
    res.json({
      success: true,
      message: 'Development test token generated',
      token: testToken,
      user: testUser,
      warning: 'This endpoint only works in development mode'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled server error:', err.stack);
  
  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong on our end',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    available_endpoints: [
      'GET /health - Health check',
      'GET /auth/google - Google OAuth',
      'GET /auth/facebook - Facebook OAuth', 
      'GET /auth/github - GitHub OAuth',
      'GET /auth/profile - User profile',
      'GET /api/property/* - Property data APIs',
      'GET /api/docs - API documentation'
    ]
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

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
  console.log('  📊 Analytics & Health Monitoring');
  console.log('\n🔗 Frontend Integration:');
  console.log(`  Direct redirect after OAuth to: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims`);
  console.log('');
});