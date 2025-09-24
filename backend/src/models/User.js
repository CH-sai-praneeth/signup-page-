const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema - Defines what user data looks like in database
 */
const userSchema = new mongoose.Schema({
  // ===== BASIC USER INFO =====
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,                    // No duplicate emails
    lowercase: true,                 // Convert to lowercase
    trim: true,                      // Remove extra spaces
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  avatar: {
    type: String,
    default: '',                     // User profile picture URL
    trim: true
  },

  // ===== OAUTH PROVIDERS =====
  providers: [{
    provider: {
      type: String,
      enum: ['google', 'facebook', 'github'],  // Only these providers allowed
      required: true
    },
    providerId: {
      type: String,
      required: true                 // User ID from OAuth provider
    },
    connectedAt: {
      type: Date,
      default: Date.now              // When user connected this provider
    }
  }],

  // ===== USER STATUS =====
  isActive: {
    type: Boolean,
    default: true                    // User account is active
  },

  isEmailVerified: {
    type: Boolean,
    default: true                    // OAuth emails are pre-verified
  },

  // ===== LOGIN TRACKING =====
  lastLogin: {
    type: Date,
    default: Date.now
  },

  loginCount: {
    type: Number,
    default: 1
  },

  // ===== ACCOUNT SETTINGS =====
  preferences: {
    newsletter: {
      type: Boolean,
      default: false
    },
    notifications: {
      type: Boolean,  
      default: true
    }
  }

}, {
  timestamps: true,                  // Adds createdAt and updatedAt automatically
  collection: 'users'                // Collection name in MongoDB
});

// ===========================
// 📊 DATABASE INDEXES (for faster queries)
// ===========================

// Index for faster email searches
userSchema.index({ email: 1 });

// Index for faster provider searches  
userSchema.index({ 'providers.provider': 1, 'providers.providerId': 1 });

// Index for active users
userSchema.index({ isActive: 1 });

// ===========================
// 🔧 INSTANCE METHODS (functions for individual users)
// ===========================

/**
 * Add new OAuth provider to existing user
 */
userSchema.methods.addProvider = function(provider, providerId) {
  // Check if provider already exists
  const existingProvider = this.providers.find(p => 
    p.provider === provider && p.providerId === providerId
  );
  
  if (!existingProvider) {
    this.providers.push({
      provider: provider,
      providerId: providerId,
      connectedAt: new Date()
    });
  }
  
  return this;
};

/**
 * Update last login time and count
 */
userSchema.methods.updateLoginInfo = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this;
};

/**
 * Get user's connected providers list
 */
userSchema.methods.getProviders = function() {
  return this.providers.map(p => p.provider);
};

/**
 * Check if user has specific provider connected
 */
userSchema.methods.hasProvider = function(provider) {
  return this.providers.some(p => p.provider === provider);
};

/**
 * Get user's public profile (safe to send to frontend)
 */
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    avatar: this.avatar,
    providers: this.getProviders(),
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    isEmailVerified: this.isEmailVerified
  };
};

// ===========================
// ⚡ STATIC METHODS (functions for User model)
// ===========================

/**
 * Find user by OAuth provider info
 */
userSchema.statics.findByProvider = function(provider, providerId) {
  return this.findOne({
    'providers.provider': provider,
    'providers.providerId': providerId,
    isActive: true
  });
};

/**
 * Find user by email
 */
userSchema.statics.findByEmail = function(email) {
  return this.findOne({
    email: email.toLowerCase(),
    isActive: true
  });
};

/**
 * Create new user from OAuth data
 */
userSchema.statics.createFromOAuth = function(oauthData) {
  return this.create({
    email: oauthData.email.toLowerCase(),
    name: oauthData.name,
    avatar: oauthData.avatar || '',
    providers: [{
      provider: oauthData.provider,
      providerId: oauthData.providerId,
      connectedAt: new Date()
    }],
    lastLogin: new Date(),
    loginCount: 1
  });
};

/**
 * Get user statistics
 */
userSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        googleUsers: { 
          $sum: { 
            $cond: [
              { $in: ['google', '$providers.provider'] }, 
              1, 
              0
            ] 
          } 
        },
        facebookUsers: { 
          $sum: { 
            $cond: [
              { $in: ['facebook', '$providers.provider'] }, 
              1, 
              0
            ] 
          } 
        },
        githubUsers: { 
          $sum: { 
            $cond: [
              { $in: ['github', '$providers.provider'] }, 
              1, 
              0
            ] 
          } 
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    googleUsers: 0,
    facebookUsers: 0,
    githubUsers: 0
  };
};

// ===========================
// 🔐 PRE-SAVE MIDDLEWARE
// ===========================

// Before saving user, do some cleanup
userSchema.pre('save', function(next) {
  // Ensure email is lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  // Clean up name
  if (this.name) {
    this.name = this.name.trim();
  }
  
  next();
});

// ===========================
// 📋 EXPORT USER MODEL
// ===========================

const User = mongoose.model('User', userSchema);

module.exports = User;