// src/routes/propertyRoutes.js
const express = require('express');
const router = express.Router();
const propertyDataService = require('../services/propertyDataService');
const { authenticateToken } = require('../middleware/auth');

/**
 * Property API Routes
 */

// ===========================
// 🔍 ADDRESS SEARCH ROUTES
// ===========================

/**
 * GET /api/property/address-suggestions
 * Get address suggestions from Google Places API
 */
router.get('/address-suggestions', authenticateToken, async (req, res) => {
  try {
    const { input } = req.query;

    if (!input || input.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Input must be at least 3 characters long'
      });
    }

    console.log(`🔍 Address suggestions request: ${input}`);

    const suggestions = await propertyDataService.getAddressSuggestions(input);

    res.json({
      success: true,
      suggestions: suggestions,
      count: suggestions.length
    });

  } catch (error) {
    console.error('❌ Address suggestions error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get address suggestions',
      message: error.message
    });
  }
});

/**
 * POST /api/property/search
 * Combined address and property data search
 */
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || address.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    console.log(`🏠 Property search request: ${address}`);

    // Check cache first
    let cachedData = await propertyDataService.getCachedPropertyData(address);
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Get fresh data
    const result = await propertyDataService.searchAddressAndProperty(address);

    // Cache the result if successful
    if (result.success && result.propertyData) {
      await propertyDataService.cachePropertyData(address, result.propertyData);
    }

    res.json({
      success: result.success,
      data: result.propertyData,
      suggestions: result.suggestions,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Property search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search property data',
      message: error.message
    });
  }
});

// ===========================
// 🏠 PROPERTY DATA ROUTES
// ===========================

/**
 * GET /api/property/data/:address
 * Get detailed property data for specific address
 */
router.get('/data/:address', authenticateToken, async (req, res) => {
  try {
    const address = decodeURIComponent(req.params.address);

    console.log(`🏠 Property data request: ${address}`);

    // Check cache first
    let propertyData = await propertyDataService.getCachedPropertyData(address);
    
    if (!propertyData) {
      // Get fresh data from APIs
      propertyData = await propertyDataService.getPropertyData(address);
      
      // Cache the result
      if (propertyData) {
        await propertyDataService.cachePropertyData(address, propertyData);
      }
    }

    if (!propertyData) {
      return res.status(404).json({
        success: false,
        error: 'Property data not found',
        message: 'No property data available for this address'
      });
    }

    res.json({
      success: true,
      data: propertyData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Property data error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get property data',
      message: error.message
    });
  }
});

// ===========================
// 📊 ANALYTICS AND HEALTH ROUTES
// ===========================

/**
 * GET /api/property/health
 * Check health status of all property data APIs
 */
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 API health check requested');

    const healthStatus = await propertyDataService.getAPIHealthStatus();

    const overallHealthy = Object.values(healthStatus.services).every(
      service => service.status === 'healthy'
    );

    res.status(overallHealthy ? 200 : 503).json({
      success: true,
      overall_status: overallHealthy ? 'healthy' : 'degraded',
      ...healthStatus
    });

  } catch (error) {
    console.error('❌ Health check error:', error.message);
    res.status(500).json({
      success: false,
      overall_status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/property/stats
 * Get API usage statistics (admin only)
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // In production, you'd pull this from a database or analytics service
    const stats = {
      total_requests: 1250,
      successful_requests: 1180,
      failed_requests: 70,
      success_rate: '94.4%',
      average_response_time: '1.2s',
      most_requested_apis: [
        { name: 'Google Places', requests: 650, success_rate: '98%' },
        { name: 'Zillow', requests: 400, success_rate: '92%' },
        { name: 'Datafiniti', requests: 200, success_rate: '89%' }
      ],
      cache_hit_rate: '67%',
      last_24_hours: {
        requests: 89,
        errors: 3
      }
    };

    res.json({
      success: true,
      stats: stats,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Stats error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

// ===========================
// 📝 CLAIM SUBMISSION ROUTES
// ===========================

/**
 * POST /api/property/submit-claim
 * Submit insurance claim with property and photo data
 */
router.post('/submit-claim', authenticateToken, async (req, res) => {
  try {
    const claimData = req.body;
    const userId = req.user?.userId;

    console.log(`📝 Claim submission from user: ${userId}`);

    // Validate required fields
    if (!claimData.address || !claimData.propertyDetails) {
      return res.status(400).json({
        success: false,
        error: 'Missing required claim data'
      });
    }

    // Generate claim ID
    const claimId = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // In production, save to database
    const claim = {
      claimId: claimId,
      userId: userId,
      address: claimData.address,
      propertyDetails: claimData.propertyDetails,
      photos: claimData.photos || [],
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      estimatedCompletionTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
      aiAnalysisStatus: 'pending'
    };

    // TODO: Save to database
    // await Claim.create(claim);

    // TODO: Trigger AI analysis pipeline
    // await aiAnalysisService.processClaim(claimId);

    console.log(`✅ Claim submitted successfully: ${claimId}`);

    res.json({
      success: true,
      claimId: claimId,
      message: 'Claim submitted successfully',
      estimatedProcessingTime: '30 minutes',
      nextSteps: [
        'AI analysis will begin immediately',
        'You will receive an email update within 30 minutes',
        'Detailed report will be available in your dashboard'
      ]
    });

  } catch (error) {
    console.error('❌ Claim submission error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to submit claim',
      message: error.message
    });
  }
});

/**
 * GET /api/property/claims
 * Get user's claim history
 */
router.get('/claims', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    console.log(`📋 Claims history request from user: ${userId}`);

    // In production, fetch from database
    // const claims = await Claim.find({ userId: userId }).sort({ submittedAt: -1 });

    // Mock data for demo
    const claims = [
      {
        claimId: 'CLM-1640123456789-ABC123DEF',
        address: '123 Main Street, Anytown, ST 12345',
        status: 'completed',
        submittedAt: '2024-01-15T10:30:00.000Z',
        completedAt: '2024-01-15T11:15:00.000Z',
        estimatedPayout: '$15,750',
        confidence: '92%'
      },
      {
        claimId: 'CLM-1640123456790-XYZ789GHI',
        address: '456 Oak Avenue, Another City, ST 67890',
        status: 'processing',
        submittedAt: '2024-01-20T14:20:00.000Z',
        estimatedCompletion: '2024-01-20T14:50:00.000Z',
        progress: '75%'
      }
    ];

    res.json({
      success: true,
      claims: claims,
      count: claims.length
    });

  } catch (error) {
    console.error('❌ Claims history error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get claims history',
      message: error.message
    });
  }
});

/**
 * GET /api/property/claim/:claimId
 * Get specific claim details
 */
router.get('/claim/:claimId', authenticateToken, async (req, res) => {
  try {
    const { claimId } = req.params;
    const userId = req.user?.userId;

    console.log(`📄 Claim details request: ${claimId} from user: ${userId}`);

    // In production, fetch from database with user verification
    // const claim = await Claim.findOne({ claimId: claimId, userId: userId });

    // Mock data for demo
    if (!claimId.startsWith('CLM-')) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    const claimDetails = {
      claimId: claimId,
      status: 'completed',
      submittedAt: '2024-01-15T10:30:00.000Z',
      completedAt: '2024-01-15T11:15:00.000Z',
      address: '123 Main Street, Anytown, ST 12345',
      propertyDetails: {
        yearBuilt: '1995',
        squareFeet: '2400',
        propertyType: 'Single Family',
        bedrooms: '3',
        bathrooms: '2'
      },
      aiAnalysis: {
        confidence: '92%',
        estimatedPayout: '$15,750',
        damageCategories: [
          { type: 'Roof Damage', severity: 'Moderate', cost: '$8,500' },
          { type: 'Siding Damage', severity: 'Minor', cost: '$3,250' },
          { type: 'Window Damage', severity: 'Minor', cost: '$4,000' }
        ],
        recommendations: [
          'Schedule roof inspection within 2 weeks',
          'Document all damage with timestamps',
          'Get quotes from licensed contractors'
        ]
      },
      photos: [
        { name: 'roof_damage_1.jpg', analysis: 'Shingle damage detected' },
        { name: 'siding_damage.jpg', analysis: 'Minor impact damage' }
      ]
    };

    res.json({
      success: true,
      claim: claimDetails
    });

  } catch (error) {
    console.error('❌ Claim details error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get claim details',
      message: error.message
    });
  }
});

// ===========================
// ❌ ERROR HANDLING
// ===========================

/**
 * Handle 404 errors for property routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Property API endpoint not found',
    available_endpoints: [
      'GET /address-suggestions?input=...',
      'POST /search',
      'GET /data/:address',
      'GET /health',
      'POST /submit-claim',
      'GET /claims',
      'GET /claim/:claimId'
    ]
  });
});

module.exports = router;
