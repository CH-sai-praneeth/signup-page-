// API Key authentication middleware
const apiKeys = {
  'sk_smartclaims_live_xxx': {
    appName: 'Smart Claims AI',
    appUrl: 'https://my-oauth-frontend.vercel.app',
    isActive: true
  }
  // Add more apps as you scale
};

const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'api_key_required',
      message: 'API key is required'
    });
  }
  
  const app = apiKeys[apiKey];
  
  if (!app) {
    return res.status(401).json({
      success: false,
      error: 'invalid_api_key',
      message: 'Invalid API key'
    });
  }
  
  if (!app.isActive) {
    return res.status(403).json({
      success: false,
      error: 'api_key_inactive',
      message: 'API key is inactive'
    });
  }
  
  // Attach app info to request
  req.app = app;
  req.apiKey = apiKey;
  next();
};

module.exports = { authenticateApiKey, apiKeys };