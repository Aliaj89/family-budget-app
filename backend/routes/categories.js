const express = require('express');
const router = express.Router();
const { Category } = require('../models');
const auth = require('../middleware/auth');

// Get all categories (system defaults + user's custom categories)
router.get('/', auth, async (req, res) => {
  try {
    const categories = await Category.find({
      $or: [
        { user: req.userId },
        { user: null } // System default categories
      ]
    }).sort({ name: 1 });
    
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get category by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      $or: [
        { user: req.userId },
        { user: null } // System default categories
      ]
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create a new category (custom user category)
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, parent } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Check if category already exists for this user
    const categoryExists = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }, // Case insensitive match
      user: req.userId
    });
    
    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    // Check if parent category exists (if provided)
    if (parent) {
      const parentExists = await Category.findOne({
        _id: parent,
        $or: [
          { user: req.userId },
          { user: null } // System default categories
        ]
      });
      
      if (!parentExists) {
        return res.status(404).json({ message: 'Parent category not found' });
      }
    }
    
    // Create new category
    const newCategory = new Category({
      name,
      description,
      parent,
      user: req.userId
    });
    
    // Save category to database
    const category = await newCategory.save();
    
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update a category
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, parent } = req.body;
    
    // Check if category exists and belongs to user
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.userId
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found or you cannot modify system categories' });
    }
    
    // Check if parent category exists (if provided)
    if (parent) {
      const parentExists = await Category.findOne({
        _id: parent,
        $or: [
          { user: req.userId },
          { user: null } // System default categories
        ]
      });
      
      if (!parentExists) {
        return res.status(404).json({ message: 'Parent category not found' });
      }
    }
    
    // Update category
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (parent !== undefined) category.parent = parent;
    
    // Save updated category
    await category.save();
    
    res.json(category);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a category
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if category exists and belongs to user
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.userId
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found or you cannot delete system categories' });
    }
    
    // Remove category
    await category.remove();
    
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all main categories (those without a parent)
router.get('/main/categories', auth, async (req, res) => {
  try {
    const mainCategories = await Category.find({
      parent: null,
      $or: [
        { user: req.userId },
        { user: null } // System default categories
      ]
    }).sort({ name: 1 });
    
    res.json(mainCategories);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get subcategories for a specific parent category
router.get('/:parentId/subcategories', auth, async (req, res) => {
  try {
    const subcategories = await Category.find({
      parent: req.params.parentId,
      $or: [
        { user: req.userId },
        { user: null } // System default categories
      ]
    }).sort({ name: 1 });
    
    res.json(subcategories);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Parent category not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
