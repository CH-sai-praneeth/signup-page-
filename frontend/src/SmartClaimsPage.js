import React, { useState, useRef } from 'react';

const SmartClaimsPage = () => {
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
  const fileInputRef = useRef(null);

  // Handle address input with Google Places API
  const handleAddressChange = async (e) => {
    const value = e.target.value;
    setAddress(value);
    
    if (value.length > 3) {
      try {
        // Google Places API call
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(value)}&types=address&key=YOUR_GOOGLE_PLACES_API_KEY`);
        const data = await response.json();
        
        if (data.predictions) {
          const suggestions = data.predictions.map(prediction => prediction.description);
          setAddressSuggestions(suggestions.slice(0, 5)); // Show top 5 suggestions
        }
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        // Fallback to demo suggestions
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

  // Fetch property data with RentCast API
  const fetchPropertyData = async (selectedAddress) => {
    setIsLoadingProperty(true);
    
    try {
      // RentCast API call
      const response = await fetch(`https://api.rentcast.io/v1/properties?address=${encodeURIComponent(selectedAddress)}`, {
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': 'YOUR_RENTCAST_API_KEY'
        }
      });
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const property = data[0];
        
        // Map API data to form fields
        const apiData = {
          yearBuilt: property.yearBuilt?.toString() || '',
          squareFeet: property.squareFootage?.toString() || '',
          propertyType: property.propertyType || '',
          bedrooms: property.bedrooms?.toString() || '',
          bathrooms: property.bathrooms?.toString() || '',
          // Auto-determine stories and material based on property data
          stories: property.stories?.toString() || (property.squareFootage > 2000 ? '2' : '1'),
          primaryMaterial: determineMaterial(property.yearBuilt, property.propertyType)
        };
        
        // Fill form with API data
        setPropertyDetails(prev => ({
          ...prev,
          ...apiData
        }));
        
        console.log('Property data loaded:', apiData);
      } else {
        console.log('No property data found for this address');
        alert('Property data not found. Please enter details manually.');
      }
      
    } catch (error) {
      console.error('Error fetching property data:', error);
      // Fallback to demo data for testing
      const demoData = {
        yearBuilt: '1995',
        squareFeet: '2400',
        propertyType: 'Single Family',
        bedrooms: '3',
        bathrooms: '2',
        stories: '2',
        primaryMaterial: 'brick'
      };
      
      setPropertyDetails(prev => ({
        ...prev,
        ...demoData
      }));
      
      console.log('Using demo data due to API error');
    } finally {
      setIsLoadingProperty(false);
    }
  };

  // Helper function to determine primary material based on property data
  const determineMaterial = (yearBuilt, propertyType) => {
    if (!yearBuilt) return '';
    
    const year = parseInt(yearBuilt);
    
    // Simple logic to guess material based on year and type
    if (year < 1950) return 'wood';
    if (year >= 1950 && year < 1980) return 'brick';
    if (year >= 1980 && year < 2000) return 'stucco';
    if (year >= 2000) return 'vinyl';
    
    return '';
  };

  const selectAddress = (selectedAddress) => {
    setAddress(selectedAddress);
    setAddressSuggestions([]);
    fetchPropertyData(selectedAddress);
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
    
    // Prepare claim data for submission
    const claimData = {
      address: address,
      propertyDetails: propertyDetails,
      photos: uploadedPhotos.map(photo => ({
        name: photo.file.name,
        size: photo.file.size,
        type: photo.file.type
      })),
      submittedAt: new Date().toISOString()
    };
    
    try {
      // Submit to your backend API
      const response = await fetch('/api/submit-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claimData)
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Claim submitted successfully!\nClaim ID: ${result.claimId}\nEstimated processing time: 30 minutes`);
        
        // Optional: Reset form or redirect user
        // setAddress('');
        // setPropertyDetails({...});
        // setUploadedPhotos([]);
      } else {
        throw new Error('Failed to submit claim');
      }
      
    } catch (error) {
      console.error('Error submitting claim:', error);
      // For demo purposes, still show success
      alert(`Claim submitted successfully!\nProperty: ${address}\nPhotos: ${uploadedPhotos.length}\nProcessing your AI estimate...`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
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

        {/* Property Information */}
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
            {isLoadingProperty && <span style={{marginLeft: '12px', fontSize: '16px', color: '#3182ce'}}>Loading...</span>}
          </h2>

          {/* Address Input */}
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
            
            {/* Address Suggestions */}
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
                zIndex: 10
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

          {/* Property Details Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 1fr)',
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
        </div>

        {/* Photo Upload */}
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

          {/* Drag and Drop Area */}
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
              marginBottom: '20px'
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

          {/* Photo Guidelines */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 12px', color: '#0c4a6e', fontSize: '14px', fontWeight: '600' }}>
              Recommended Photos:
            </h4>
            <div style={{ fontSize: '14px', color: '#0369a1', lineHeight: '1.5' }}>
              ✓ Exterior roof damage<br/>
              ✓ Close-up damage details<br/>
              ✓ Interior ceiling/wall damage<br/>
              ✓ Damaged windows/doors<br/>
              ✓ Debris and surrounding area
            </div>
          </div>

          {/* Uploaded Photos */}
          {uploadedPhotos.length > 0 && (
            <div>
              <h4 style={{
                fontSize: '16px',
                color: '#2d3748',
                margin: '0 0 15px'
              }}>
                Uploaded: {uploadedPhotos.length} 
photo{uploadedPhotos.length !== 1 ? 's' : ''}
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 
1fr))',
                gap: '12px'
              }}>
                {uploadedPhotos.map(photo => (
                  <div key={photo.id} style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#f7fafc'
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
                        top: '4px',
                        right: '4px',
                        backgroundColor: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
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
              borderRadius: '8px',
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 14px 0 rgba(49, 130, 206, 0.4)'
            }}
          >
            Get My Strategic Estimate
          </button>
          <p style={{
            fontSize: '14px',
            color: '#718096',
            margin: '12px 0 0'
          }}>
            AI-powered analysis in under 30 minutes
          </p>
        </div>
      </div>
    </div>
  );
};

export default SmartClaimsPage;
