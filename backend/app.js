const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initializeDatabase } = require('./src/config/database');
const oauthService = require('./src/services/oauthService');

initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth Signup</title>
        <style>
            body { font-family: Arial; padding: 50px; text-align: center; }
            .login-btn { 
                display: inline-block; 
                margin: 10px; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 5px;
                color: white;
                font-weight: bold;
            }
            .google { background: #db4437; }
            .facebook { background: #3b5998; }
            .github { background: #333; }
        </style>
    </head>
    <body>
        <h1>Welcome! Sign up with your social account</h1>
        
        <a href="/auth/google" class="login-btn google">Login with Google</a>
        <a href="/auth/facebook" class="login-btn facebook">Login with Facebook</a>
        <a href="/auth/github" class="login-btn github">Login with GitHub</a>
        
        <p>Choose your preferred social login method above</p>
    </body>
    </html>
  `);
});

// OAuth initiation routes (same as before)
app.get('/auth/google', (req, res) => {
  const state = oauthService.generateState();
  const authUrl = oauthService.getGoogleAuthUrl(state);
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
    const { code, error } = req.query;
    
    if (error || !code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
    }
    
    const result = await oauthService.completeOAuthFlow('google', code);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/welcome?token=${result.token}`);
    
  } catch (error) {
    console.error('Google OAuth error:', error.message);
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