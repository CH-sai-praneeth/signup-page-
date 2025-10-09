import React, { useState, useRef, useEffect } from 'react';

const SmartClaimsPage = ({ backendUrl }) => {
  const BACKEND_URL = backendUrl || process.env.REACT_APP_BACKEND_URL || 'https://signup-page-b4tb.onrender.com';
  
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [address, setAddress] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [propertyDetails, setPropertyDetails] = useState({
    yearBuilt: '',
    squareFeet: '',
    stories: '1',
    primaryMaterial: '',
    roofType: '',
    provider: '',
    propertyType: '',
    bedrooms: '',
    bathrooms: ''
  });
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        const paymentResult = urlParams.get('payment');

      // Handle payment status popup
        if (paymentResult) {
          if (paymentResult === 'success') {
            setPaymentStatus('success');
          } else if (paymentResult === 'cancelled') {
            setPaymentStatus('failed');
          }

        // Auto-hide popup after 4 seconds
          setTimeout(() => {
            setPaymentStatus(null);
          // Clean URL
            window.history.replaceState({}, document.title, '/claims');
          }, 4000);
        }

        if (urlToken) {
          localStorage.setItem('authToken', urlToken);
        }
      
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          const response = await fetch(`${BACKEND_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
        
          if (response.ok) {
            const userData = await response.json();
            setUser(userData.user);
            setIsAuthenticated(true);
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            localStorage.removeItem('authToken');
            redirectToLogin();
            return;
          }
        } else {
          redirectToLogin();
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setError('Authentication failed. Please try logging in again.');
        localStorage.removeItem('authToken');
        setTimeout(() => redirectToLogin(), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [BACKEND_URL]);

  const redirectToLogin = () => {
    window.location.href = window.location.origin;
  };

  const handleLogout = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
      redirectToLogin();
    }
  };

  // NEW: PDF Upload Handler
  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 10MB');
      return;
    }

    try {
      setIsLoadingProperty(true);
      setError('');

      const formData = new FormData();
      formData.append('document', file);

      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${BACKEND_URL}/api/document/parse-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('PDF parsed:', result.data);
        
        setPropertyDetails(prev => ({
          ...prev,
          ...result.data
        }));

        if (result.data.address) {
          setAddress(result.data.address);
        }

        const fieldsFound = result.metadata.fieldsFound;
        alert(`PDF processed successfully!\n\nExtracted ${fieldsFound} out of 9 fields.\n\nPlease review and fill any missing information.`);
      } else {
        throw new Error(result.message || 'Failed to parse PDF');
      }

    } catch (error) {
      console.error('PDF upload error:', error);
      setError('Failed to parse PDF. Please try again or enter information manually.');
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoadingProperty(false);
      e.target.value = '';
    }
  };

  const handleAddressChange = async (e) => {
    const value = e.target.value;
    setAddress(value);
    
    if (value.length > 3) {
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`${BACKEND_URL}/api/property/address-suggestions?input=${encodeURIComponent(value)}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAddressSuggestions(data.suggestions || []);
        } else {
          const mockSuggestions = [
            `${value} Street, City, State`,
            `${value} Avenue, City, State`, 
            `${value} Drive, City, State`,
            `${value} Road, City, State`,
            `${value} Boulevard, City, State`
          ];
          setAddressSuggestions(mockSuggestions);
        }
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        const mockSuggestions = [
          `${value} Street, City, State`,
          `${value} Avenue, City, State`, 
          `${value} Drive, City, State`
        ];
        setAddressSuggestions(mockSuggestions);
      }
    } else {
      setAddressSuggestions([]);
    }
  };

  // COMMENTED OUT: Datafiniti API integration (keeping Google Maps address suggestions)
  const fetchPropertyData = async (selectedAddress) => {
    setIsLoadingProperty(true);
    
    try {
      // COMMENTED OUT: Datafiniti API call
      /*
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${BACKEND_URL}/api/property/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address: selectedAddress })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          setPropertyDetails(prev => ({
            ...prev,
            ...result.data
          }));
          console.log('Property data loaded from API:', result.data);
        } else {
          throw new Error('No property data found');
        }
      } else {
        throw new Error('API request failed');
      }
      */
      
      // Fallback to mock data for testing
      const mockPropertyData = {
        yearBuilt: Math.floor(Math.random() * (2023 - 1950) + 1950).toString(),
        squareFeet: Math.floor(Math.random() * (4000 - 1000) + 1000).toString(),
        propertyType: ['Single Family', 'Townhouse', 'Condo'][Math.floor(Math.random() * 3)],
        bedrooms: Math.floor(Math.random() * 5 + 1).toString(),
        bathrooms: (Math.floor(Math.random() * 3) + 1 + Math.random()).toFixed(1),
        stories: Math.floor(Math.random() * 3 + 1).toString(),
        primaryMaterial: ['wood', 'brick', 'stucco', 'vinyl'][Math.floor(Math.random() * 4)],
        roofType: ['asphalt', 'metal', 'tile'][Math.floor(Math.random() * 3)]
      };
      
      setPropertyDetails(prev => ({
        ...prev,
        ...mockPropertyData
      }));
      
      console.log('Using mock data:', mockPropertyData);
    } catch (error) {
      console.error('Error fetching property data:', error);
    } finally {
      setIsLoadingProperty(false);
    }
  };

  const selectAddress = (selectedAddress) => {
    setAddress(selectedAddress);
    setAddressSuggestions([]);
    //fetchPropertyData(selectedAddress);
  };

  const handlePropertyChange = (field, value) => {
    setPropertyDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoUpload = (files) => {
    const newPhotos = Array.from(files).map(file => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file)
    }));
    setUploadedPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handlePhotoUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removePhoto = (id) => {
    setUploadedPhotos(prev => prev.filter(photo => photo.id !== id));
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      alert('Please enter a property address');
      return;
    }
    if (uploadedPhotos.length === 0) {
      alert('Please upload at least one damage photo');
      return;
    }
    
    const claimData = {
      address: address,
      propertyDetails: propertyDetails,
      photos: uploadedPhotos.map(photo => ({
        name: photo.file.name,
        size: photo.file.size,
        type: photo.file.type
      })),
      submittedAt: new Date().toISOString(),
      userId: user?.id
    };
    
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${BACKEND_URL}/api/property/submit-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(claimData)
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Claim submitted successfully!\nClaim ID: ${result.claimId}\nEstimated processing time: ${result.estimatedProcessingTime}\n\nNext steps:\n${result.nextSteps?.join('\n') || 'Check your email for updates'}`);
        
        setAddress('');
        setPropertyDetails({
          yearBuilt: '',
          squareFeet: '',
          stories: '1',
          primaryMaterial: '',
          roofType: '',
          provider: '',
          propertyType: '',
          bedrooms: '',
          bathrooms: ''
        });
        setUploadedPhotos([]);
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit claim');
      }
      
    } catch (error) {
      console.error('Error submitting claim:', error);
      alert(`Claim submission failed: ${error.message}\n\nPlease try again or contact support if the problem persists.`);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        fontSize: '18px',
        color: '#4a5568'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔐</div>
        <div>Authenticating...</div>
        <div style={{ fontSize: '14px', color: '#718096', marginTop: '10px' }}>
          Connecting to {BACKEND_URL}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <h2 style={{ color: '#e53e3e', marginBottom: '10px' }}>Authentication Error</h2>
        <p style={{ color: '#4a5568', textAlign: 'center', maxWidth: '400px' }}>{error}</p>
        <button
          onClick={redirectToLogin}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          position: 'relative'
        }}>
          {/* Left side - Profile */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <img
              src={user?.avatar || 'https://via.placeholder.com/32'}
              alt="Profile"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%'
            }}
          />
          <span style={{
            fontSize: '14px',
            color: '#4a5568',
            fontWeight: '500'
          }}>
            {user?.name}
          </span>
        </div>
        {/* Right side - Payment + Logout */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <button
            onClick={async () => {
              try {
                const authToken = localStorage.getItem('authToken');
                const response = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    amount: 29.99,
                    claimId: 'test-123'
                  })
                });

                const result = await response.json();
                if (result.success) {
                // Redirect to PayPal
                  window.location.href = result.approvalUrl;
                } else {
                  alert('Payment failed: ' + result.message);
                }
              } catch (error) {
                alert('Payment error: ' + error.message);
              }
            }}
            style={{
              backgroundColor: '#0070ba',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            💳 Pay Now
          </button>
    
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>

        <div style={{ fontSize: '60px', marginBottom: '16px' }}>🏠💡</div>
        <h1 style={{
          fontSize: '36px',
          color: '#1a202c',
          margin: '0 0 12px',
          fontWeight: 'bold'
        }}>
          Smart Claims AI
        </h1>
        <p style={{ fontSize: '20px', color: '#4a5568', margin: '0', fontWeight: '500' }}>
          Maximize Your Insurance Claim Payouts with AI
        </p>
        <p style={{ fontSize: '16px', color: '#718096', margin: '8px 0 0' }}>
          Get strategic estimates and increase payouts 15-30% on average
        </p>
      </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{
            fontSize: '24px',
            color: '#2d3748',
            margin: '0 0 20px',
            display: 'flex',
            alignItems: 'center'
          }}>
            🏠 Property Information
            {isLoadingProperty && <span style={{marginLeft: '12px', fontSize: '16px', color: '#3182ce'}}>Loading property data...</span>}
          </h2>

          {/* NEW: PDF Upload Section */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '2px dashed #3b82f6',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '25px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📄</div>
            <h3 style={{ margin: '0 0 8px', color: '#1e40af', fontSize: '18px', fontWeight: '600' }}>
              Upload Property Document
            </h3>
            <p style={{ margin: '0 0 15px', fontSize: '14px', color: '#4b5563' }}>
              Upload insurance declaration, tax assessment, or appraisal (PDF only)
            </p>
            
            <input
              type="file"
              accept=".pdf"
              onChange={handlePDFUpload}
              style={{ display: 'none' }}
              id="pdf-upload"
              disabled={isLoadingProperty}
            />
            
            <label
              htmlFor="pdf-upload"
              style={{
                display: 'inline-block',
                backgroundColor: isLoadingProperty ? '#9ca3af' : '#3b82f6',
                color: 'white',
                padding: '12px 32px',
                borderRadius: '8px',
                cursor: isLoadingProperty ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'all 0.3s ease'
              }}
            >
              {isLoadingProperty ? '⏳ Processing...' : '📤 Upload PDF'}
            </label>
            
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
              PDF only • Max 10MB • Free pattern matching
            </div>
          </div>

          <div style={{ marginBottom: '25px', position: 'relative' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#4a5568',
              marginBottom: '8px'
            }}>
              Property Address
            </label>
            <input
              type="text"
              value={address}
              onChange={handleAddressChange}
              placeholder="Start typing your address..."
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            
            {addressSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '2px solid #e2e8f0',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                zIndex: 10,
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {addressSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => selectAddress(suggestion)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: index < addressSuggestions.length - 1 ? '1px solid #f7fafc' : 'none'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f7fafc'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    📍 {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)',
            gap: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '6px'
              }}>
                Year Built
              </label>
              <input
                type="number"
                value={propertyDetails.yearBuilt}
                onChange={(e) => handlePropertyChange('yearBuilt', e.target.value)}
                placeholder="1995"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '6px'
              }}>
                Square Feet
              </label>
              <input
                type="number"
                value={propertyDetails.squareFeet}
                onChange={(e) => handlePropertyChange('squareFeet', e.target.value)}
                placeholder="2400"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '6px'
              }}>
                Property Type
              </label>
              <select
                value={propertyDetails.propertyType}
                onChange={(e) => handlePropertyChange('propertyType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select type</option>
                <option value="Single Family">Single Family</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Condo">Condo</option>
                <option value="Multi-Family">Multi-Family</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '6px'
              }}>
                Bedrooms
              </label>
              <input
                type="number"
                value={propertyDetails.bedrooms}
                onChange={(e) => handlePropertyChange('bedrooms', e.target.value)}
                placeholder="3"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '6px'
              }}>
                Bathrooms
              </label>
              <input
                type="number"
                step="0.5"
                value={propertyDetails.bathrooms}
                onChange={(e) => handlePropertyChange('bathrooms', e.target.value)}
                placeholder="2"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '6px'
              }}>
                Stories
              </label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                {['1', '2', '3+'].map(option => (
                  <label key={option} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="stories"
                      value={option}
                      checked={propertyDetails.stories === option}
                      onChange={(e) => handlePropertyChange('stories', e.target.value)}
                      style={{ marginRight: '6px' }}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '6px'
              }}>
                Primary Material
              </label>
              <select
                value={propertyDetails.primaryMaterial}
                onChange={(e) => handlePropertyChange('primaryMaterial', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select material</option>
                <option value="wood">Wood</option>
                <option value="brick">Brick</option>
                <option value="stucco">Stucco</option>
                <option value="vinyl">Vinyl</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '6px'
              }}>
                Roof Type
              </label>
              <select
                value={propertyDetails.roofType}
                onChange={(e) => handlePropertyChange('roofType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select roof type</option>
                <option value="asphalt">Asphalt</option>
                <option value="metal">Metal</option>
                <option value="tile">Tile</option>
                <option value="flat">Flat</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '6px'
              }}>
                Insurance Provider
              </label>
              <select
                value={propertyDetails.provider}
                onChange={(e) => handlePropertyChange('provider', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select provider</option>
                <option value="statefarm">State Farm</option>
                <option value="allstate">Allstate</option>
                <option value="geico">GEICO</option>
                <option value="progressive">Progressive</option>
                <option value="farmers">Farmers</option>
                <option value="usaa">USAA</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {isLoadingProperty && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#e6fffa',
              border: '1px solid #81e6d9',
              borderRadius: '8px',
              color: '#234e52'
            }}>
              🔍 Processing document...
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{
            fontSize: '24px',
            color: '#2d3748',
            margin: '0 0 20px',
            display: 'flex',
            alignItems: 'center'
          }}>
            📸 Upload Damage Photos
          </h2>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current.click()}
            style={{
              border: '3px dashed #cbd5e0',
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#f7fafc',
              marginBottom: '20px',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
            <p style={{
              fontSize: '18px',
              color: '#4a5568',
              margin: '0 0 8px',
              fontWeight: '600'
            }}>
              Drag & Drop Photos Here
            </p>
            <p style={{
              fontSize: '14px',
              color: '#718096',
              margin: '0'
            }}>
              or click to browse files
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            capture="camera"
            onChange={(e) => handlePhotoUpload(e.target.files)}
            style={{ display: 'none' }}
          />

          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 12px', color: '#0c4a6e', fontSize: '14px', fontWeight: '600' }}>
              📋 Recommended Photos:
            </h4>
            <div style={{ fontSize: '14px', color: '#0369a1', lineHeight: '1.6' }}>
              ✅ Exterior roof damage<br/>
              ✅ Close-up damage details<br/>
              ✅ Interior ceiling/wall damage<br/>
              ✅ Damaged windows/doors<br/>
              ✅ Debris and surrounding area<br/>
              ✅ Before/after photos (if available)
            </div>
          </div>

          {uploadedPhotos.length > 0 && (
            <div>
              <h4 style={{
                fontSize: '16px',
                color: '#2d3748',
                margin: '0 0 15px'
              }}>
                📷 Uploaded: {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? 's' : ''}
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '15px'
              }}>
                {uploadedPhotos.map(photo => (
                  <div key={photo.id} style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#f7fafc',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <img
                      src={photo.preview}
                      alt="Damage"
                      style={{
                        width: '100%',
                        height: '120px',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      onClick={() => removePhoto(photo.id)}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        backgroundColor: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    >
                      ×
                    </button>
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      fontSize: '12px',
                      padding: '4px 8px'
                    }}>
                      {photo.file.name.length > 15 
                        ? photo.file.name.substring(0, 12) + '...' 
                        : photo.file.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <button
            onClick={handleSubmit}
            style={{
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '18px 48px',
              fontSize: '20px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(49, 130, 206, 0.3)',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#2c5aa0';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 28px rgba(49, 130, 206, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#3182ce';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 24px rgba(49, 130, 206, 0.3)';
            }}
          >
            🚀 Get My Strategic Estimate
          </button>
          <p style={{
            fontSize: '16px',
            color: '#718096',
            margin: '16px 0 0',
            fontWeight: '500'
          }}>
            ⚡ AI-powered analysis in under 30 minutes
          </p>
          <p style={{
            fontSize: '14px',
            color: '#9ca3af',
            margin: '8px 0 0'
          }}>
            Secure • Confidential • Instant Processing
          </p>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '40px',
          padding: '20px',
          color: '#9ca3af',
          fontSize: '12px'
        }}>
          <p>🔐 Your data is encrypted and secure</p>
          <p>📧 Questions? Contact support@smartclaims.ai</p>
          <p style={{ marginTop: '10px', fontSize: '10px' }}>
            Backend: {BACKEND_URL} • Status: <span style={{ color: '#10b981' }}>● Connected</span>
          </p>
        </div>
      </div>
          {/* Payment Status Popup */}
      {paymentStatus && (
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              backgroundColor: paymentStatus === 'success' ? '#10b981' : '#ef4444',
              borderRadius: '24px',
              padding: '40px 50px',
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              maxWidth: '350px',
              width: '90%'
            }}>
              <div style={{
                fontSize: '80px',
                marginBottom: '20px',
                animation: 'bounceIn 0.6s ease-out',
                color: 'white'
              }}>
                {paymentStatus === 'success' ? '✓' : '✕'}
              </div>

              <h2 style={{
                color: 'white',
                fontSize: '28px',
                fontWeight: 'bold',
                margin: '0'
              }}>
                {paymentStatus === 'success' ? 'Payment Successful!' : 'Payment Failed'}
              </h2>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes scaleIn {
              from {
                opacity: 0;
                transform: scale(0.8);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            
            @keyframes bounceIn {
              0% {
                opacity: 0;
                transform: scale(0);
              }
              50% {
                transform: scale(1.2);
              }
              100% {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
};

export default SmartClaimsPage;
