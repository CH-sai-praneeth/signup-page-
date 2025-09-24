import React from 'react';
import SmartClaimsPage from './SmartClaimsPage';

function App() {
  // Get backend URL from environment or use production default
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://signup-page-b4tb.onrender.com';
  
  const handleSocialLogin = (provider) => {
    window.location.href = `${BACKEND_URL}/auth/${provider}`;
  };

  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  
  // 🐛 DEBUG: Log what we're checking
  console.log('🔍 DEBUG - Current path:', currentPath);
  console.log('🔍 DEBUG - Current search:', currentSearch);
  
  // Check for token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const hasToken = urlParams.get('token');
  
  console.log('🔍 DEBUG - Has token:', !!hasToken);
  console.log('🔍 DEBUG - Token preview:', hasToken ? hasToken.substring(0, 50) + '...' : 'None');
  
  // Check routing conditions
  const shouldShowClaims = currentPath === '/claims' || currentPath === '/welcome' || hasToken;
  console.log('🔍 DEBUG - Should show claims page:', shouldShowClaims);
  
  // 🔧 FIX: Check for /claims path OR if there's a token in URL
  if (shouldShowClaims) {
    console.log('✅ DEBUG - Showing Smart Claims Page');
    return <SmartClaimsPage backendUrl={BACKEND_URL} />;
  }

  console.log('❌ DEBUG - Showing Login Page');
  
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
      {/* 🐛 DEBUG INFO - Remove this after fixing */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        fontSize: '12px',
        borderRadius: '5px',
        zIndex: 1000
      }}>
        <div>Path: {currentPath}</div>
        <div>Token: {hasToken ? '✅ Found' : '❌ Missing'}</div>
        <div>Should show claims: {shouldShowClaims ? 'YES' : 'NO'}</div>
      </div>
      
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
          >
            🔍 Continue with Google
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
          >
            📘 Continue with Facebook
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
          >
            🐙 Continue with GitHub
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