const express = require('express');
const cors = require('cors');
require('dotenv').config();
const session = require('express-session');
const helmet = require('helmet');
const { initializeDatabase } = require('./src/config/database');
const oauthService = require('./src/services/oauthService');

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
    secure: process.env.NODE_ENV === 'production', // secure only in prod
    sameSite: 'none'
  }
}));

const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true
}));


app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OAuth backend running!', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/ping', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date(),
    uptime: process.uptime(),
    message: 'OAuth app is running!'
  });
});


// OAuth initiation routes (same as before)
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
  const authUrl = oauthService.getFacebookAuthUrl(state);
  console.log('Redirecting to Facebook OAuth');
  res.redirect(authUrl);
});

app.get('/auth/github', (req, res) => {
  const state = oauthService.generateState();
  const authUrl = oauthService.getGithubAuthUrl(state);
  console.log('Redirecting to GitHub OAuth');
  res.redirect(authUrl);
});

// ENHANCED OAuth callbacks with complete token exchange
app.get('/auth/google/callback', async (req, res) => {
  try {
    console.log('🔄 [GOOGLE CALLBACK] Hit');
    console.log('📥 Query Params:', req.query);
    console.log('📦 Session State:', req.session?.oauthState);

    const { code, error, state } = req.query;

    // Step 1: Check if Google sent an error
    if (error) {
      console.error('❌ Google returned an error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_error`);
    }

    // Step 2: Make sure we got a code
    if (!code) {
      console.error('❌ Missing authorization code in callback');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=missing_code`);
    }

    // Step 3: Validate state parameter for CSRF protection
    if (!state || state !== req.session?.oauthState) {
      console.error('❌ OAuth state mismatch!');
      console.log('Expected state:', req.session?.oauthState);
      console.log('Received state:', state);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=state_mismatch`);
    }

    // Step 4: Complete token exchange
    console.log('🔑 Exchanging authorization code for tokens...');
    const result = await oauthService.completeOAuthFlow('google', code);

    console.log('✅ OAuth Exchange Successful!');
    console.log('👤 Authenticated User:', result.user?.email);
    console.log('🔗 Redirecting to frontend:', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/welcome`);

    // Step 5: Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/welcome?token=${result.token}`);
    
  } catch (err) {
    console.error('❌ [GOOGLE CALLBACK] Uncaught error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
  }
});



app.get('/auth/facebook/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error || !code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
    }
    
    const result = await oauthService.completeOAuthFlow('facebook', code);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/welcome?token=${result.token}`);
    
  } catch (error) {
    console.error('Facebook OAuth error:', error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
  }
});

app.get('/auth/github/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error || !code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
    }
    
    const result = await oauthService.completeOAuthFlow('github', code);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/welcome?token=${result.token}`);
    
  } catch (error) {
    console.error('GitHub OAuth error:', error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
  }
});

// User profile endpoint
app.get('/auth/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'missing_token' });
    }
    
    const token = authHeader.substring(7);
    const decoded = oauthService.verifyJWT(token);
    
    const User = require('./src/models/User');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'user_not_found' });
    }
    
    res.json({ success: true, user: user.getPublicProfile() });
  } catch (error) {
    res.status(401).json({ error: 'invalid_token' });
  }
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('\nOAuth Backend Server Started!');
  console.log(`Server: http://localhost:${PORT}`);
  console.log('Ready for complete OAuth authentication!');
});