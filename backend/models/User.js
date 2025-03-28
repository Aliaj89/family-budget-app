const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  baseCurrency: {
    type: String,
    default: 'USD'
  },
  monthlyIncome: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Google OAuth tokens
  accessToken: String,
  refreshToken: String
});

module.exports = mongoose.model('User', UserSchema);
