const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { User } = require('../models');

// Google OAuth route
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/spreadsheets'] 
}));

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // Create JWT token
    const token = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Redirect to frontend
    res.redirect(process.env.NODE_ENV === 'production' 
      ? '/' 
      : 'http://localhost:3000/dashboard'
    );
  }
);

// Logout route
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // User is attached to req by the JWT strategy
    const user = await User.findById(req.user._id).select('-accessToken -refreshToken');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update user preferences (e.g., baseCurrency, monthlyIncome)
router.put('/preferences', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { baseCurrency, monthlyIncome } = req.body;
    
    // Update user preferences
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        ...(baseCurrency && { baseCurrency }),
        ...(monthlyIncome && { monthlyIncome })
      },
      { new: true }
    ).select('-accessToken -refreshToken');
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
