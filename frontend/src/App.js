import React from 'react';
import SmartClaimsPage from './SmartClaimsPage';

function App() {
  // Get backend URL from environment or use production default
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://signup-page-b4tb.onrender.com';
  
  const handleSocialLogin = (provider) => {
    window.location.href = `${BACKEND_URL}/auth/${provider}`;
  };

  const currentPath = window.location.pathname;

  const urlParams = new URLSearchParams(window.location.search);
  const hasToken = urlParams.get('token');
  
  // Direct redirect to claims after OAuth success or if accessing /claims
  if (currentPath === '/claims' || currentPath === '/welcome') {
    return <SmartClaimsPage backendUrl={BACKEND_URL} />;
  }

  return (
    <div style={{ 
      padding: '50px', 
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🏠💡</div>
        <h1 style={{ 
          color: '#333', 
          marginBottom: '10px',
          fontSize: '28px',
          fontWeight: 'bold'
        }}>
          Smart Claims AI
        </h1>
        <p style={{ 
          color: '#666', 
          marginBottom: '30px',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          Maximize your insurance claim payouts with AI-powered analysis.<br/>
          <strong>Choose your preferred login method:</strong>
        </p>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px', 
          maxWidth: '100%',
          margin: '0 auto' 
        }}>
          <button 
            onClick={() => handleSocialLogin('google')}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '15px 20px', 
              fontSize: '16px', 
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#3367d6';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(66, 133, 244, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#4285f4';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.3)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          
          <button 
            onClick={() => handleSocialLogin('facebook')}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '15px 20px', 
              fontSize: '16px', 
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: '#1877f2',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(24, 119, 242, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#166fe5';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(24, 119, 242, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#1877f2';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(24, 119, 242, 0.3)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
          
          <button 
            onClick={() => handleSocialLogin('github')}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '15px 20px', 
              fontSize: '16px', 
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(51, 51, 51, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#24292e';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(51, 51, 51, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#333';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(51, 51, 51, 0.3)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>
        
        <div style={{ 
          marginTop: '30px', 
          paddingTop: '20px',
          borderTop: '1px solid #eee',
          color: '#888', 
          fontSize: '12px',
          lineHeight: '1.4'
        }}>
          <p>🔐 Secure OAuth 2.0 Authentication</p>
          <p>✅ Your data is encrypted and protected</p>
          <p style={{ marginTop: '10px' }}>
            <strong>Backend:</strong> {BACKEND_URL}<br/>
            <strong>Status:</strong> <span style={{ color: '#10b981' }}>● Online</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;