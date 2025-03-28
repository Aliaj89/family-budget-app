const express = require('express');
const router = express.Router();
const { RecurringExpense, Category } = require('../models');
const auth = require('../middleware/auth');

// Get all recurring expenses for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const recurringExpenses = await RecurringExpense.find({ user: req.userId })
      .populate('category', 'name')
      .sort({ nextOccurrence: 1 });
    
    res.json(recurringExpenses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get recurring expense by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const recurringExpense = await RecurringExpense.findOne({
      _id: req.params.id,
      user: req.userId
    }).populate('category', 'name');
    
    if (!recurringExpense) {
      return res.status(404).json({ message: 'Recurring expense not found' });
    }
    
    res.json(recurringExpense);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Recurring expense not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create a new recurring expense
router.post('/', auth, async (req, res) => {
  try {
    const {
      amount,
      currency,
      category,
      frequency,
      startDate,
      endDate,
      description
    } = req.body;
    
    // Validate required fields
    if (!amount || !category || !frequency || !startDate || !description) {
      return res.status(400).json({
        message: 'Please provide amount, category, frequency, startDate, and description'
      });
    }
    
    // Check if category exists
    const categoryExists = await Category.findOne({
      _id: category,
      $or: [{ user: req.userId }, { user: null }] // User's custom category or system default
    });
    
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Calculate next occurrence based on frequency and start date
    const start = new Date(startDate);
    let nextOccurrence = new Date(start);
    
    // If start date is in the past, calculate the next upcoming occurrence
    const today = new Date();
    if (start < today) {
      switch (frequency) {
        case 'daily':
          nextOccurrence = new Date(today);
          break;
        case 'weekly':
          const dayDiff = (today.getDay() - start.getDay() + 7) % 7;
          nextOccurrence = new Date(today);
          nextOccurrence.setDate(today.getDate() + (dayDiff === 0 ? 7 : dayDiff));
          break;
        case 'monthly':
          nextOccurrence = new Date(today.getFullYear(), today.getMonth(), start.getDate());
          if (nextOccurrence < today) {
            nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
          }
          break;
        case 'yearly':
          nextOccurrence = new Date(today.getFullYear(), start.getMonth(), start.getDate());
          if (nextOccurrence < today) {
            nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
          }
          break;
      }
    }
    
    // Create new recurring expense
    const newRecurringExpense = new RecurringExpense({
      amount,
      currency: currency || req.user.baseCurrency || 'USD',
      category,
      frequency,
      startDate: start,
      endDate: endDate ? new Date(endDate) : null,
      nextOccurrence,
      description,
      user: req.userId
    });
    
    // Save recurring expense to database
    const recurringExpense = await newRecurringExpense.save();
    
    // Populate category for response
    await recurringExpense.populate('category', 'name');
    
    res.status(201).json(recurringExpense);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update a recurring expense
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      amount,
      currency,
      category,
      frequency,
      startDate,
      endDate,
      description
    } = req.body;
    
    // Find recurring expense
    const recurringExpense = await RecurringExpense.findOne({
      _id: req.params.id,
      user: req.userId
    });
    
    if (!recurringExpense) {
      return res.status(404).json({ message: 'Recurring expense not found' });
    }
    
    // Check if category exists (if being updated)
    if (category && category !== recurringExpense.category.toString()) {
      const categoryExists = await Category.findOne({
        _id: category,
        $or: [{ user: req.userId }, { user: null }] // User's custom category or system default
      });
      
      if (!categoryExists) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }
    
    // Update fields
    if (amount) recurringExpense.amount = amount;
    if (currency) recurringExpense.currency = currency;
    if (category) recurringExpense.category = category;
    if (description) recurringExpense.description = description;
    
    // If frequency or startDate changes, recalculate nextOccurrence
    let shouldRecalculateNext = false;
    
    if (frequency && frequency !== recurringExpense.frequency) {
      recurringExpense.frequency = frequency;
      shouldRecalculateNext = true;
    }
    
    if (startDate) {
      recurringExpense.startDate = new Date(startDate);
      shouldRecalculateNext = true;
    }
    
    if (endDate !== undefined) {
      recurringExpense.endDate = endDate ? new Date(endDate) : null;
    }
    
    // Recalculate next occurrence if needed
    if (shouldRecalculateNext) {
      const start = recurringExpense.startDate;
      const today = new Date();
      
      if (start < today) {
        switch (recurringExpense.frequency) {
          case 'daily':
            recurringExpense.nextOccurrence = new Date(today);
            break;
          case 'weekly':
            const dayDiff = (today.getDay() - start.getDay() + 7) % 7;
            recurringExpense.nextOccurrence = new Date(today);
            recurringExpense.nextOccurrence.setDate(today.getDate() + (dayDiff === 0 ? 7 : dayDiff));
            break;
          case 'monthly':
            recurringExpense.nextOccurrence = new Date(today.getFullYear(), today.getMonth(), start.getDate());
            if (recurringExpense.nextOccurrence < today) {
              recurringExpense.nextOccurrence.setMonth(recurringExpense.nextOccurrence.getMonth() + 1);
            }
            break;
          case 'yearly':
            recurringExpense.nextOccurrence = new Date(today.getFullYear(), start.getMonth(), start.getDate());
            if (recurringExpense.nextOccurrence < today) {
              recurringExpense.nextOccurrence.setFullYear(recurringExpense.nextOccurrence.getFullYear() + 1);
            }
            break;
        }
      } else {
        recurringExpense.nextOccurrence = new Date(start);
      }
    }
    
    // Save updated recurring expense
    await recurringExpense.save();
    
    // Populate category for response
    await recurringExpense.populate('category', 'name');
    
    res.json(recurringExpense);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Recurring expense not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a recurring expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const recurringExpense = await RecurringExpense.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });
    
    if (!recurringExpense) {
      return res.status(404).json({ message: 'Recurring expense not found' });
    }
    
    res.json({ message: 'Recurring expense deleted successfully' });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Recurring expense not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
