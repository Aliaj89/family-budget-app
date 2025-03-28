const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null means it's a system default category
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for better performance
CategorySchema.index({ name: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Category', CategorySchema);
