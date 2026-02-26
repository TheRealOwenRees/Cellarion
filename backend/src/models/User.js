const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    validate: {
      validator: (v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{12,}$/.test(v),
      message: 'Password must be at least 12 characters and include an uppercase letter, lowercase letter, number, and special character'
    }
  },
  roles: {
    type: [String],
    enum: ['user', 'somm', 'admin'],
    default: ['user'],
    validate: {
      validator: (arr) => arr.length > 0,
      message: 'User must have at least one role'
    }
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium'],
    default: 'free'
  },
  preferences: {
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true
    },
    language: {
      type: String,
      default: 'en',
      trim: true
    }
  },
  refreshTokenHash: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified or new
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Store a hashed refresh token
userSchema.methods.setRefreshToken = function(token) {
  this.refreshTokenHash = crypto.createHash('sha256').update(token).digest('hex');
};

// Validate a refresh token against the stored hash
userSchema.methods.validateRefreshToken = function(token) {
  if (!this.refreshTokenHash) return false;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(this.refreshTokenHash));
};

// Remove sensitive fields from JSON responses
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
