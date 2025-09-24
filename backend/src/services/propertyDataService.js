const axios = require('axios');
const crypto = require('crypto');

/**
 * Property Data Service - Integrates with external APIs for property information
 */
class PropertyDataService {

  // ===========================
  // 🗺️ GOOGLE PLACES API FOR ADDRESS SUGGESTIONS
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

      if (response.data.status === 'OK' && response.data.predictions) {
        const suggestions = response.data.predictions.map(prediction => prediction.description);
        console.log(`✅ Found ${suggestions.length} address suggestions from Google Places`);
        return suggestions.slice(0, 5); // Return top 5 suggestions
      }

      if (response.data.status === 'ZERO_RESULTS') {
        console.log('⚠️ Google Places returned zero results');
        return this.getMockAddressSuggestions(input);
      }

      console.error('❌ Google Places API error:', response.data.status);
      return this.getMockAddressSuggestions(input);
      
    } catch (error) {
      console.error('❌ Google Places API error:', error.response?.data || error.message);
      
      // Fallback to mock suggestions
      return this.getMockAddressSuggestions(input);
    }
  }

  /**
   * Get mock address suggestions as fallback
   */
  getMockAddressSuggestions(input) {
    return [
      `${input} Street, Sample City, ST`,
      `${input} Avenue, Sample City, ST`,
      `${input} Drive, Sample City, ST`,
      `${input} Road, Sample City, ST`,
      `${input} Boulevard, Sample City, ST`
    ];
  }

  // ===========================
  // 🏠 DATAFINITI API FOR PROPERTY DATA
  // ===========================

  /**
   * Get property data from Datafiniti API (Primary source for building/house info)
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
        timeout: 15000
      });

      if (response.data.records && response.data.records.length > 0) {
        const property = response.data.records[0];
        console.log('✅ Property data found from Datafiniti');
        return this.normalizePropertyData('datafiniti', property);
      }
      
      console.log('⚠️ No property data found in Datafiniti');
      return null;
      
    } catch (error) {
      console.error('❌ Datafiniti API error:', error.response?.data || error.message);
      return null;
    }
  }

  // ===========================
  // 🏢 ALTERNATIVE PROPERTY DATA APIS
  // ===========================

  /**
   * Get property data from RentCast API (Alternative source)
   */
  async getPropertyFromRentCast(address) {
    try {
      console.log(`🔍 Fetching property data from RentCast for: ${address}`);
      
      if (!process.env.RENTCAST_API_KEY) {
        console.log('⚠️ RentCast API key not configured, skipping');
        return null;
      }

      const response = await axios.get('https://api.rentcast.io/v1/properties', {
        params: {
          address: address,
          limit: 1
        },
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': process.env.RENTCAST_API_KEY
        },
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        const property = response.data[0];
        console.log('✅ Property data found from RentCast');
        return this.normalizePropertyData('rentcast', property);
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ RentCast API error:', error.response?.data || error.message);
      return null;
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
        console.log('✅ Property data found from Zillow');
        return this.normalizePropertyData('zillow', property);
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Zillow API error:', error.response?.data || error.message);
      return null;
    }
  }

  // ===========================
  // 🔄 DATA NORMALIZATION
  // ===========================

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
            yearBuilt: rawData.yearBuilt?.toString() || rawData.dateBuilt?.toString() || '',
            squareFeet: rawData.livingSpace?.toString() || rawData.livingArea?.toString() || rawData.squareFootage?.toString() || '',
            propertyType: this.normalizePropertyType(rawData.propertyType || rawData.homeType),
            bedrooms: rawData.numBedrooms?.toString() || rawData.bedrooms?.toString() || '',
            bathrooms: rawData.numBathrooms?.toString() || rawData.bathrooms?.toString() || rawData.fullBaths?.toString() || '',
            stories: rawData.stories?.toString() || this.estimateStories(rawData.livingSpace || rawData.livingArea, rawData.propertyType),
            primaryMaterial: this.estimateMaterial(rawData.yearBuilt || rawData.dateBuilt, rawData.propertyType),
            roofType: this.estimateRoofType(rawData.yearBuilt || rawData.dateBuilt, rawData.propertyType),
            address: rawData.address || rawData.streetAddress || '',
            city: rawData.city || '',
            state: rawData.state || rawData.province || '',
            zipCode: rawData.postalCode || rawData.zipCode || ''
          };
          break;

        case 'rentcast':
          normalizedData = {
            ...normalizedData,
            yearBuilt: rawData.yearBuilt?.toString() || '',
            squareFeet: rawData.squareFootage?.toString() || '',
            propertyType: this.normalizePropertyType(rawData.propertyType),
            bedrooms: rawData.bedrooms?.toString() || '',
            bathrooms: rawData.bathrooms?.toString() || '',
            stories: rawData.stories?.toString() || this.estimateStories(rawData.squareFootage, rawData.propertyType),
            primaryMaterial: this.estimateMaterial(rawData.yearBuilt, rawData.propertyType),
            roofType: this.estimateRoofType(rawData.yearBuilt, rawData.propertyType),
            address: rawData.address || '',
            city: rawData.city || '',
            state: rawData.state || '',
            zipCode: rawData.zipcode || ''
          };
          break;

        case 'zillow':
          normalizedData = {
            ...normalizedData,
            yearBuilt: rawData.yearBuilt?.toString() || '',
            squareFeet: rawData.livingArea?.toString() || '',
            propertyType: this.normalizePropertyType(rawData.propertyType),
            bedrooms: rawData.bedrooms?.toString() || '',
            bathrooms: rawData.bathrooms?.toString() || '',
            stories: rawData.stories?.toString() || this.estimateStories(rawData.livingArea, rawData.propertyType),
            primaryMaterial: this.estimateMaterial(rawData.yearBuilt, rawData.propertyType),
            roofType: this.estimateRoofType(rawData.yearBuilt, rawData.propertyType),
            address: rawData.streetAddress || '',
            city: rawData.city || '',
            state: rawData.state || '',
            zipCode: rawData.zipcode || ''
          };
          break;

        default:
          throw new Error(`Unsupported data source: ${source}`);
      }

      console.log('✅ Property data normalized from', source);
      return normalizedData;
      
    } catch (error) {
      console.error('❌ Data normalization error:', error.message);
      return null;
    }
  }

  // ===========================
  // 🛠️ HELPER METHODS
  // ===========================

  normalizePropertyType(type) {
    if (!type) return '';
    
    const typeStr = type.toString().toLowerCase();
    if (typeStr.includes('single') || typeStr.includes('detached')) return 'Single Family';
    if (typeStr.includes('town') || typeStr.includes('row')) return 'Townhouse';
    if (typeStr.includes('condo') || typeStr.includes('condominium')) return 'Condo';
    if (typeStr.includes('multi') || typeStr.includes('duplex')) return 'Multi-Family';
    
    return 'Single Family'; // default
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

  // ===========================
  // 🎯 MAIN PUBLIC METHODS
  // ===========================

  /**
   * Main method to get property data - tries multiple sources with Datafiniti first
   */
  async getPropertyData(address) {
    try {
      console.log(`🏠 Starting property data search for: ${address}`);
      
      // Try Datafiniti first (primary source for building/house info)
      // Then try alternative sources
      const dataSources = [
        () => this.getPropertyFromDatafiniti(address),
        () => this.getPropertyFromRentCast(address),
        () => this.getPropertyFromZillow(address)
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
      return this.generateMockPropertyData(address);
    }
  }

  /**
   * Combined search - get both address suggestions and property data
   */
  async searchAddressAndProperty(address) {
    try {
      console.log(`🔍 Combined search for: ${address}`);
      
      // Always try to get property data for complete addresses
      const propertyData = await this.getPropertyData(address);

      return {
        success: true,
        propertyData: propertyData,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Combined search error:', error.message);
      return {
        success: false,
        propertyData: this.generateMockPropertyData(address),
        error: error.message,
        timestamp: new Date().toISOString()
      };
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
  // 🏥 API HEALTH CHECK
  // ===========================

  /**
   * Get API health status
   */
  async getAPIHealthStatus() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Test Google Places API
    healthStatus.services.google_places = {
      status: process.env.GOOGLE_PLACES_API_KEY ? 'configured' : 'not_configured',
      purpose: 'Address autocomplete suggestions',
      endpoint: 'Google Places API'
    };

    // Test Datafiniti API
    healthStatus.services.datafiniti = {
      status: process.env.DATAFINITI_API_KEY ? 'configured' : 'not_configured',
      purpose: 'Property details and building information',
      endpoint: 'Datafiniti Property API'
    };

    // Test RentCast API
    healthStatus.services.rentcast = {
      status: process.env.RENTCAST_API_KEY ? 'configured' : 'not_configured',
      purpose: 'Alternative property data source',
      endpoint: 'RentCast API'
    };

    // Test Zillow API
    healthStatus.services.zillow = {
      status: process.env.RAPIDAPI_KEY ? 'configured' : 'not_configured',
      purpose: 'Alternative property data via RapidAPI',
      endpoint: 'Zillow via RapidAPI'
    };

    return healthStatus;
  }
}

// ===========================
// 📤 EXPORT SERVICE
// ===========================

// Export single instance (singleton pattern)
module.exports = new PropertyDataService();