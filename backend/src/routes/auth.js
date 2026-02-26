const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../services/audit');
const rateLimitsConfig = require('../config/rateLimits');

const router = express.Router();

// Rate limiter for auth endpoints — default 10 per 15 min (admin-configurable)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => rateLimitsConfig.get().auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logAudit(req, 'system.rate_limit_exceeded', {}, { limiter: 'auth', limit: rateLimitsConfig.get().auth.max });
    res.status(429).json({ error: 'Too many attempts, please try again later' });
  }
});

// Generate short-lived access token (default 15 min)
const generateAccessToken = (user) => {
  const roles = user.roles && user.roles.length > 0 ? user.roles : ['user'];
  return jwt.sign(
    { id: user._id, roles, plan: user.plan || 'free' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' }
  );
};

// Generate opaque refresh token (random bytes) and store its hash on the user
const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

// Cookie options for the httpOnly refresh token
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
};

// Issue both tokens: access token in body, refresh token in httpOnly cookie
const issueTokens = async (user, res) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  user.setRefreshToken(refreshToken);
  await user.save();
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
  return accessToken;
};

// POST /api/auth/register - Register new user
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'An account with that email or username already exists' });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      roles: ['user']
    });

    // Issue tokens (saves refreshTokenHash to user doc inside)
    const accessToken = await issueTokens(user, res);

    logAudit(req, 'auth.register',
      { type: 'user', id: user._id },
      { username: user.username, email: user.email }
    );

    res.status(201).json({
      token: accessToken,
      user: user.toJSON()
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login - Login user
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }]
    });

    if (!user) {
      logAudit(req, 'auth.login.failed', {}, { identifier: username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      logAudit(req, 'auth.login.failed',
        { type: 'user', id: user._id },
        { username: user.username }
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = await issueTokens(user, res);

    logAudit(req, 'auth.login.success',
      { type: 'user', id: user._id },
      { username: user.username }
    );

    res.json({
      token: accessToken,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh - Issue new access token using httpOnly refresh token cookie
router.post('/refresh', async (req, res) => {
  const incomingToken = req.cookies?.refreshToken;
  if (!incomingToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    // Decode without verification to get the user ID, then validate hash in DB
    // (Refresh tokens are opaque random bytes — not JWTs — so just look up by hash)
    // We find the user whose stored hash matches this token
    const tokenHash = require('crypto').createHash('sha256').update(incomingToken).digest('hex');
    const user = await User.findOne({ refreshTokenHash: tokenHash });

    if (!user) {
      res.clearCookie('refreshToken', refreshCookieOptions);
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Rotate: issue new pair (invalidates the old refresh token hash)
    const accessToken = await issueTokens(user, res);

    res.json({ token: accessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.clearCookie('refreshToken', refreshCookieOptions);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout - Invalidate refresh token
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshTokenHash = null;
      await user.save();
    }
    res.clearCookie('refreshToken', refreshCookieOptions);
    res.json({ message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me - Get current user (protected)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
