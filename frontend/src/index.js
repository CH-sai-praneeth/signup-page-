import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Performance monitoring (optional)
import reportWebVitals from './reportWebVitals';

//APP INITIALIZATION
// Create root element for React 18+
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the app with routing support
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);


// Measure performance
reportWebVitals(console.log);


// Log environment info in development
if (process.env.NODE_ENV === 'development') {
  console.log('🎯 OAuth Frontend Started!');
  console.log('📍 Environment:', process.env.NODE_ENV);
  console.log('🔗 API URL:', process.env.REACT_APP_API_URL);
  console.log('📱 App Name:', process.env.REACT_APP_APP_NAME);
  console.log('🔑 Google Client ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID ? ' Loaded' : ' Missing');
  console.log('🔑 Facebook App ID:', process.env.REACT_APP_FACEBOOK_APP_ID ? ' Loaded' : ' Missing');
  console.log('🔑 GitHub Client ID:', process.env.REACT_APP_GITHUB_CLIENT_ID ? ' Loaded' : ' Missing');
}