import React from 'react';
import SmartClaimsPage from './SmartClaimsPage';

const Welcome = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  // Save the JWT token for future use
  if (token) {
    localStorage.setItem('authToken', token);
  }
  
  return (
    <div style={{ 
      padding: '50px', 
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#e8f5e8',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#2d5a2d', marginBottom: '20px' }}>
        🎉 Welcome! Authentication Successful
      </h1>
      <p style={{ color: '#4a7c4a', marginBottom: '30px', fontSize: '18px' }}>
        You have successfully logged in with your social account.
      </p>
      
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        maxWidth: '400px', 
        margin: '20px auto',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3>What's Next?</h3>
        <p>Your account is now connected and ready to use.</p>
        {token && <p style={{fontSize: '12px', color: '#666'}}>Token saved securely</p>}
      </div>

      <button 
        onClick={() => window.location.href = '/claims'}
        style={{ 
          padding: '15px 30px', 
          fontSize: '16px', 
          cursor: 'pointer',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          marginTop: '20px'
        }}
      >
        Start Insurance Claim
      </button>
      
      <button 
        onClick={() => window.location.href = '/'}
        style={{ 
          padding: '15px 30px', 
          fontSize: '16px', 
          cursor: 'pointer',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          marginTop: '20px',
          marginLeft: '10px'
        }}
      >
        Logout
      </button>
    </div>
  );
};

function App() {
  const handleSocialLogin = (provider) => {
    window.location.href = `https://signup-page-b4tb.onrender.com/auth/${provider}`;
  };

  const currentPath = window.location.pathname;
  
  if (currentPath === '/claims') {
    return <SmartClaimsPage />;
  }
  
  // Show welcome page after OAuth success
  if (currentPath === '/welcome') {
    return <Welcome />;
  }

  return (
    <div style={{ 
      padding: '50px', 
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>
        🔐 OAuth Social Login
      </h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>
        Choose your preferred login method:
      </p>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px', 
        maxWidth: '300px', 
        margin: '0 auto' 
      }}>
        <button 
          onClick={() => handleSocialLogin('google')}
          style={{ 
            padding: '15px 20px', 
            fontSize: '16px', 
            cursor: 'pointer',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            transition: 'background-color 0.3s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#3367d6'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#4285f4'}
        >
          🔍 Continue with Google
        </button>
        
        <button 
          onClick={() => handleSocialLogin('facebook')}
          style={{ 
            padding: '15px 20px', 
            fontSize: '16px', 
            cursor: 'pointer',
            backgroundColor: '#1877f2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            transition: 'background-color 0.3s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#166fe5'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#1877f2'}
        >
          📘 Continue with Facebook
        </button>
        
        <button 
          onClick={() => handleSocialLogin('github')}
          style={{ 
            padding: '15px 20px', 
            fontSize: '16px', 
            cursor: 'pointer',
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            transition: 'background-color 0.3s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#24292e'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#333'}
        >
          🐙 Continue with GitHub
        </button>
      </div>
      
      <div style={{ marginTop: '40px', color: '#888', fontSize: '14px' 
}}>
        <p>Secure OAuth 2.0 Authentication</p>
        <p>✅ Frontend: Ready | Backend: http://localhost:3001</p>
      </div>
    </div>
  );
}

export default App;
