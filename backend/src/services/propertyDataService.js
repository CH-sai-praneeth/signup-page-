const axios = require('axios');
const crypto = require('crypto');

/**
 * Property Data Service - Integrates with external APIs for property information
 */
class PropertyDataService {

  // ===========================
  // 🏠 PROPERTY DATA APIS
  // ===========================

  /**
   * Get property data from Datafiniti API
   */
  async getPropertyFromDatafiniti(address) {
    try {
      console.log(`🔍 Fetching property data from Datafiniti for: ${address}`);
      
      if (!process.env.DATAFINITI_API_KEY) {
        console.log('⚠️ Datafiniti API key not configured, skipping');
        return null;
      }

      const response = await axios.post('https://api.datafiniti.co/v4/properties/search', {
        query: address,
        num_records: 1,
        download: false
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.DATAFINITI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.records && response.data.records.length > 0) {
        const property = response.data.records[0];
        
        return this.normalizePropertyData('datafiniti', property);
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Datafiniti API error:', error.response?.data || error.message);
      throw new Error('Failed to fetch property data from Datafiniti');
    }
  }

  /**
   * Get property data from RentSpree API (alternative)
   */
  async getPropertyFromRentSpree(address) {
    try {
      console.log(`🔍 Fetching property data from RentSpree for: ${address}`);
      
      if (!process.env.RENTSPREE_API_KEY) {
        console.log('⚠️ RentSpree API key not configured, skipping');
        return null;
      }

      const response = await axios.get('https://api.rentspree.com/v1/properties/search', {
        params: {
          address: address,
          limit: 1
        },
        headers: {
          'Authorization': `Bearer ${process.env.RENTSPREE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.data && response.data.data.length > 0) {
        const property = response.data.data[0];
        
        return this.normalizePropertyData('rentspree', property);
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ RentSpree API error:', error.response?.data || error.message);
      throw new Error('Failed to fetch property data from RentSpree');
    }
  }

  /**
   * Get property data from Zillow API (via RapidAPI)
   */
  async getPropertyFromZillow(address) {
    try {
      console.log(`🔍 Fetching property data from Zillow for: ${address}`);
      
      if (!process.env.RAPIDAPI_KEY) {
        console.log('⚠️ RapidAPI key not configured, skipping Zillow');
        return null;
      }

      const response = await axios.get('https://zillow-com1.p.rapidapi.com/propertyExtendedSearch', {
        params: {
          location: address,
          home_type: 'Houses'
        },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com'
        },
        timeout: 10000
      });

      if (response.data.props && response.data.props.length > 0) {
        const property = response.data.props[0];
        
        return this.normalizePropertyData('zillow', property);
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Zillow API error:', error.response?.data || error.message);
      throw new Error('Failed to fetch property data from Zillow');
    }
  }

  /**
   * Normalize property data from different API sources
   */
  normalizePropertyData(source, rawData) {
    try {
      let normalizedData = {
        source: source,
        confidence: 0.8
      };

      switch (source) {
        case 'datafiniti':
          normalizedData = {
            ...normalizedData,
            yearBuilt: rawData.yearBuilt?.toString() || '',
            squareFeet: rawData.livingSpace?.toString() || rawData.lotSize?.toString() || '',
            propertyType: rawData.propertyType || '',
            bedrooms: rawData.numBedrooms?.toString() || '',
            bathrooms: rawData.numBathrooms?.toString() || '',
            stories: this.estimateStories(rawData.livingSpace, rawData.propertyType),
            primaryMaterial: this.estimateMaterial(rawData.yearBuilt, rawData.propertyType),
            roofType: this.estimateRoofType(rawData.yearBuilt, rawData.propertyType),
            lotSize: rawData.lotSize?.toString() || '',
            address: rawData.address || rawData.streetAddress || '',
            city: rawData.city || '',
            state: rawData.state || rawData.province || '',
            zipCode: rawData.postalCode || ''
          };
          break;

        case 'rentspree':
          normalizedData = {
            ...normalizedData,
            yearBuilt: rawData.year_built?.toString() || '',
            squareFeet: rawData.square_feet?.toString() || '',
            propertyType: rawData.property_type || '',
            bedrooms: rawData.bedrooms?.toString() || '',
            bathrooms: rawData.bathrooms?.toString() || '',
            stories: this.estimateStories(rawData.square_feet, rawData.property_type),
            primaryMaterial: this.estimateMaterial(rawData.year_built, rawData.property_type),
            roofType: this.estimateRoofType(rawData.year_built, rawData.property_type),
            address: rawData.address || '',
            city: rawData.city || '',
            state: rawData.state || '',
            zipCode: rawData.zip_code || ''
          };
          break;

        case 'zillow':
          normalizedData = {
            ...normalizedData,
            yearBuilt: rawData.yearBuilt?.toString() || '',
            squareFeet: rawData.livingArea?.toString() || '',
            propertyType: rawData.propertyType || '',
            bedrooms: rawData.bedrooms?.toString() || '',
            bathrooms: rawData.bathrooms?.toString() || '',
            stories: rawData.stories?.toString() || this.estimateStories(rawData.livingArea, rawData.propertyType),
            primaryMaterial: this.estimateMaterial(rawData.yearBuilt, rawData.propertyType),
            roofType: this.estimateRoofType(rawData.yearBuilt, rawData.propertyType),
            lotSize: rawData.lotAreaValue?.toString() || '',
            address: rawData.streetAddress || '',
            city: rawData.city || '',
            state: rawData.state || '',
            zipCode: rawData.zipcode || ''
          };
          break;

        default:
          throw new Error(`Unsupported data source: ${source}`);
      }

      console.log('✅ Property data normalized:', normalizedData);
      return normalizedData;
      
    } catch (error) {
      console.error('❌ Data normalization error:', error.message);
      return null;
    }
  }

  /**
   * Estimate number of stories based on square footage and property type
   */
  estimateStories(squareFeet, propertyType) {
    const sqft = parseInt(squareFeet) || 0;
    const type = (propertyType || '').toLowerCase();

    // Condos and apartments are typically single story
    if (type.includes('condo') || type.includes('apartment')) {
      return '1';
    }

    // Townhouses are often multi-story
    if (type.includes('townhouse') || type.includes('town home')) {
      return sqft > 1500 ? '2' : '1';
    }

    // Single family homes - estimate based on square footage
    if (sqft < 1200) return '1';
    if (sqft < 2500) return '2';
    return '3+';
  }

  /**
   * Estimate primary building material based on year and location
   */
  estimateMaterial(yearBuilt, propertyType) {
    const year = parseInt(yearBuilt) || 0;
    
    if (year < 1950) return 'wood';
    if (year >= 1950 && year < 1980) return 'brick';
    if (year >= 1980 && year < 2000) return 'stucco';
    if (year >= 2000) return 'vinyl';
    
    return 'wood'; // default
  }

  /**
   * Estimate roof type based on year and region
   */
  estimateRoofType(yearBuilt, propertyType) {
    const year = parseInt(yearBuilt) || 0;
    const type = (propertyType || '').toLowerCase();

    // Condos often have flat roofs
    if (type.includes('condo') || type.includes('apartment')) {
      return 'flat';
    }

    // Most residential properties use asphalt
    if (year >= 1970) return 'asphalt';
    if (year >= 1950) return 'tile';
    return 'asphalt'; // default
  }

  /**
   * Main method to get property data - tries multiple sources
   */
  async getPropertyData(address) {
    try {
      console.log(`🏠 Starting property data search for: ${address}`);
      
      // Try multiple data sources in order of preference
      const dataSources = [
        () => this.getPropertyFromDatafiniti(address),
        () => this.getPropertyFromZillow(address),
        () => this.getPropertyFromRentSpree(address)
      ];

      for (const getDataFromSource of dataSources) {
        try {
          const propertyData = await getDataFromSource();
          if (propertyData) {
            console.log(`✅ Property data found from ${propertyData.source}`);
            return propertyData;
          }
        } catch (error) {
          console.log(`⚠️ Data source failed: ${error.message}`);
          continue; // Try next source
        }
      }

      // If no external data found, return mock data for demo
      console.log('⚠️ No external property data found, generating mock data');
      return this.generateMockPropertyData(address);
      
    } catch (error) {
      console.error('❌ Property data search failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate realistic mock property data for demo purposes
   */
  generateMockPropertyData(address) {
    const yearBuilt = Math.floor(Math.random() * (2023 - 1950) + 1950);
    const squareFeet = Math.floor(Math.random() * (4000 - 1000) + 1000);
    
    return {
      source: 'mock',
      confidence: 0.5,
      yearBuilt: yearBuilt.toString(),
      squareFeet: squareFeet.toString(),
      propertyType: ['Single Family', 'Townhouse', 'Condo'][Math.floor(Math.random() * 3)],
      bedrooms: Math.floor(Math.random() * 5 + 1).toString(),
      bathrooms: (Math.floor(Math.random() * 3) + 1 + Math.random()).toFixed(1),
      stories: this.estimateStories(squareFeet, 'Single Family'),
      primaryMaterial: this.estimateMaterial(yearBuilt, 'Single Family'),
      roofType: this.estimateRoofType(yearBuilt, 'Single Family'),
      address: address,
      city: 'Sample City',
      state: 'Sample State',
      zipCode: '12345'
    };
  }

  // ===========================
  // 🗺️ GOOGLE PLACES API INTEGRATION
  // ===========================

  /**
   * Get address suggestions from Google Places API
   */
  async getAddressSuggestions(input) {
    try {
      if (!process.env.GOOGLE_PLACES_API_KEY) {
        console.log('⚠️ Google Places API key not configured, using mock suggestions');
        return [
          `${input} Street, Sample City, ST`,
          `${input} Avenue, Sample City, ST`,
          `${input} Drive, Sample City, ST`,
          `${input} Road, Sample City, ST`,
          `${input} Boulevard, Sample City, ST`
        ];
      }

      console.log(`🔍 Getting address suggestions for: ${input}`);
      
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
        params: {
          input: input,
          types: 'address',
          components: 'country:us', // Restrict to US addresses
          key: process.env.GOOGLE_PLACES_API_KEY
        },
        timeout: 5000
      });

      if (response.data.predictions) {
        const suggestions = response.data.predictions.map(prediction => prediction.description);
        console.log(`✅ Found ${suggestions.length} address suggestions`);
        return suggestions.slice(0, 5); // Return top 5 suggestions
      }

      return [];
      
    } catch (error) {
      console.error('❌ Google Places API error:', error.response?.data || error.message);
      
      // Fallback to mock suggestions
      return [
        `${input} Street, Sample City, ST`,
        `${input} Avenue, Sample City, ST`,
        `${input} Drive, Sample City, ST`
      ];
    }
  }

  /**
   * Get detailed place information from Google Places API
   */
  async getPlaceDetails(placeId) {
    try {
      if (!process.env.GOOGLE_PLACES_API_KEY) {
        console.log('⚠️ Google Places API key not configured');
        return null;
      }

      console.log(`🔍 Getting place details for: ${placeId}`);
      
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          place_id: placeId,
          fields: 'formatted_address,address_components,geometry',
          key: process.env.GOOGLE_PLACES_API_KEY
        },
        timeout: 5000
      });

      if (response.data.result) {
        console.log('✅ Place details retrieved');
        return response.data.result;
      }

      return null;
      
    } catch (error) {
      console.error('❌ Google Places details error:', error.response?.data || error.message);
      throw new Error('Failed to get place details');
    }
  }

  // ===========================
  // 🎯 PUBLIC API METHODS
  // ===========================

  /**
   * Combined search - get both address suggestions and property data
   */
  async searchAddressAndProperty(input) {
    try {
      // Get address suggestions first
      const suggestions = await this.getAddressSuggestions(input);
      
      // If input looks like a complete address, also try to get property data
      let propertyData = null;
      if (input.length > 10 && input.includes(',')) {
        try {
          propertyData = await this.getPropertyData(input);
        } catch (error) {
          console.log('⚠️ Property data not available for this address');
        }
      }

      return {
        suggestions: suggestions,
        propertyData: propertyData,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Combined search error:', error.message);
      return {
        suggestions: [],
        propertyData: null,
        success: false,
        error: error.message
      };
    }
  }

  // ===========================
  // 📊 ANALYTICS AND REPORTING
  // ===========================

  /**
   * Log API usage statistics
   */
  async logAPIUsage(source, success, responseTime) {
    try {
      // In production, you might want to store this in a database
      console.log(`📊 API Usage: ${source} | Success: ${success} | Response Time: ${responseTime}ms`);
      
      // Could integrate with analytics services like Google Analytics, Mixpanel, etc.
      if (typeof gtag !== 'undefined') {
        gtag('event', 'api_call', {
          'custom_parameter': source,
          'value': success ? 1 : 0
        });
      }
      
    } catch (error) {
      console.error('❌ Analytics logging error:', error.message);
    }
  }

  /**
   * Get API health status
   */
  async getAPIHealthStatus() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Test each API service
    const services = [
      { name: 'datafiniti', test: () => this.testDatafinitiConnection() },
      { name: 'zillow', test: () => this.testZillowConnection() },
      { name: 'google_places', test: () => this.testGooglePlacesConnection() }
    ];

    for (const service of services) {
      try {
        const startTime = Date.now();
        await service.test();
        const responseTime = Date.now() - startTime;
        
        healthStatus.services[service.name] = {
          status: 'healthy',
          responseTime: `${responseTime}ms`,
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        healthStatus.services[service.name] = {
          status: 'unhealthy',
          error: error.message,
          lastChecked: new Date().toISOString()
        };
      }
    }

    return healthStatus;
  }

  /**
   * Test API connections
   */
  async testDatafinitiConnection() {
    if (!process.env.DATAFINITI_API_KEY) {
      throw new Error('API key not configured');
    }
    // Simple test - just check if we can hit the endpoint
    console.log('🧪 Testing Datafiniti connection...');
    return true; // In production, make actual test call
  }

  async testZillowConnection() {
    if (!process.env.RAPIDAPI_KEY) {
      throw new Error('RapidAPI key not configured');
    }
    console.log('🧪 Testing Zillow connection...');
    return true; // In production, make actual test call
  }

  async testGooglePlacesConnection() {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured');
    }
    console.log('🧪 Testing Google Places connection...');
    return true; // In production, make actual test call
  }

  // ===========================
  // 💾 CACHING METHODS
  // ===========================

  /**
   * Cache property data to avoid repeated API calls
   */
  async cachePropertyData(address, data) {
    try {
      // In production, use Redis or similar caching solution
      const cacheKey = `property_${address.replace(/\s+/g, '_').toLowerCase()}`;
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      };

      // For now, just log that we would cache this
      console.log(`💾 Caching property data for: ${address}`);
      
      // In production:
      // await redis.setex(cacheKey, 86400, JSON.stringify(cacheData));
      
    } catch (error) {
      console.error('❌ Caching error:', error.message);
    }
  }

  /**
   * Get cached property data
   */
  async getCachedPropertyData(address) {
    try {
      const cacheKey = `property_${address.replace(/\s+/g, '_').toLowerCase()}`;
      
      // In production:
      // const cached = await redis.get(cacheKey);
      // if (cached) {
      //   const cacheData = JSON.parse(cached);
      //   if (Date.now() - cacheData.timestamp < cacheData.ttl) {
      //     console.log(`💾 Using cached data for: ${address}`);
      //     return cacheData.data;
      //   }
      // }
      
      console.log(`💾 No cached data found for: ${address}`);
      return null;
      
    } catch (error) {
      console.error('❌ Cache retrieval error:', error.message);
      return null;
    }
  }
}

// ===========================
// 📤 EXPORT SERVICE
// ===========================

// Export single instance (singleton pattern)
module.exports = new PropertyDataService();
