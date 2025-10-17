import React, { useState, useEffect } from 'react';
import SmartClaimsPage from './SmartClaimsPage';

// 🆕 NEW: Simple Payment Status Line Component
const PaymentStatusLine = () => {
  const [status, setStatus] = useState(null);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    // Check URL parameters for payment status
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    
    // Get all token parameters and use the one that's not empty
    const allTokens = urlParams.getAll('token');
    const token = allTokens.find(t => t && t.trim() !== '') || null;
    
    if (payment) {
      setStatus(payment);
      if (token) setOrderId(token);
      
      // Save to sessionStorage so it persists during the session
      sessionStorage.setItem('paymentStatus', payment);
      if (token) sessionStorage.setItem('paymentOrderId', token);
    } else {
      // Check if we have a saved status
      const saved = sessionStorage.getItem('paymentStatus');
      const savedOrderId = sessionStorage.getItem('paymentOrderId');
      if (saved) setStatus(saved);
      if (savedOrderId) setOrderId(savedOrderId);
    }
  }, []);

  // Don't show anything if no payment status
  if (!status) return null;

  // Check if payment was successful (approved, success, completed)
  const isSuccess = ['approved', 'success', 'completed'].includes(status.toLowerCase());
  // Check if payment was cancelled/failed
  const isCancelled = ['cancelled', 'canceled', 'failed'].includes(status.toLowerCase());

  // Don't show if status is unrecognized
  if (!isSuccess && !isCancelled) return null;

  return (
    <div style={{
      padding: '12px 20px',
      backgroundColor: isSuccess ? '#ecfdf5' : '#fef2f2',
      borderBottom: `1px solid ${isSuccess ? '#a7f3d0' : '#fecaca'}`,
      textAlign: 'center',
      fontSize: '14px',
      color: isSuccess ? '#065f46' : '#991b1b',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px'
    }}>
      <span>
        {isSuccess ? '✓' : '✕'} Payment {isSuccess ? 'Successful' : isCancelled ? 'Cancelled' : 'Failed'}
        {isSuccess && orderId && (
          <span style={{ fontWeight: 'bold', marginLeft: '5px' }}>
            #{orderId.slice(-8).toUpperCase()}
          </span>
        )}
      </span>
      
      <button
        onClick={() => {
          setStatus(null);
          setOrderId(null);
          sessionStorage.removeItem('paymentStatus');
          sessionStorage.removeItem('paymentOrderId');
          // Also clean the URL
          const url = new URL(window.location);
          url.searchParams.delete('payment');
          window.history.replaceState({}, '', url);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: 'bold',
          padding: '0 5px',
          lineHeight: 1
        }}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

function App() {
  // Get backend URL from environment or use production default
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://signup-page-b4tb.onrender.com';
  
  const handleSocialLogin = (provider) => {
    window.location.href = `${BACKEND_URL}/auth/${provider}`;
  };

  const currentPath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const hasToken = urlParams.get('token');
  
  // Enhanced authentication check
  const hasStoredToken = localStorage.getItem('authToken');
  const shouldShowClaims = hasToken || (currentPath === '/claims' && hasStoredToken);

  if (shouldShowClaims) {
    // Save token if it exists in URL
    if (hasToken) {
      localStorage.setItem('authToken', hasToken);
      console.log('✅ Token saved to localStorage');
    }
    
    return (
      <div>
        {/* 🆕 NEW: Payment Status Line - Shows after payment */}
        <PaymentStatusLine />
        
        {/* Your existing SmartClaimsPage */}
        <SmartClaimsPage backendUrl={BACKEND_URL} />
      </div>
    );
  }

  // Login page
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
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
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
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
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
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
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