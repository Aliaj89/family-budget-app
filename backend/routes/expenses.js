const express = require('express');
const router = express.Router();
const { Expense, Category } = require('../models');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const axios = require('axios');

// Get all expenses for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    // Optional query parameters for filtering
    const { startDate, endDate, category, limit = 50, skip = 0 } = req.query;
    
    // Build filter query
    const filter = { user: req.userId };
    
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      filter.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.date = { $lte: new Date(endDate) };
    }
    
    if (category) {
      filter.category = category;
    }
    
    // Get expenses with pagination
    const expenses = await Expense.find(filter)
      .populate('category', 'name')
      .sort({ date: -1 })
      .skip(Number(skip))
      .limit(Number(limit));
    
    // Get total count for pagination
    const total = await Expense.countDocuments(filter);
    
    res.json({
      expenses,
      pagination: {
        total,
        limit: Number(limit),
        skip: Number(skip),
        hasMore: total > (Number(skip) + expenses.length)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get expense by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.userId
    }).populate('category', 'name');
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    res.json(expense);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create a new expense
router.post('/', auth, async (req, res) => {
  try {
    const { amount, currency, category, date, description, isRecurring } = req.body;
    
    // Validate required fields
    if (!amount || !category || !description) {
      return res.status(400).json({ message: 'Please provide amount, category, and description' });
    }
    
    // Check if category exists
    const categoryExists = await Category.findOne({
      _id: category,
      $or: [{ user: req.userId }, { user: null }] // User's custom category or system default
    });
    
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Create new expense
    const newExpense = new Expense({
      amount,
      currency: currency || req.user.baseCurrency || 'USD',
      category,
      date: date ? new Date(date) : new Date(),
      description,
      isRecurring: isRecurring || false,
      user: req.userId
    });
    
    // Save expense to database
    const expense = await newExpense.save();
    
    // Populate category for response
    await expense.populate('category', 'name');
    
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create expense with bill image
router.post('/with-bill', auth, upload.single('billImage'), async (req, res) => {
  try {
    const { amount, currency, category, date, description, isRecurring } = req.body;
    
    // Validate required fields
    if (!amount || !category || !description) {
      return res.status(400).json({ message: 'Please provide amount, category, and description' });
    }
    
    // Create new expense with image path
    const newExpense = new Expense({
      amount,
      currency: currency || req.user.baseCurrency || 'USD',
      category,
      date: date ? new Date(date) : new Date(),
      description,
      isRecurring: isRecurring || false,
      user: req.userId,
      billImage: req.file ? `/uploads/${req.file.filename}` : null
    });
    
    // Save expense to database
    const expense = await newExpense.save();
    
    // Populate category for response
    await expense.populate('category', 'name');
    
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update an expense
router.put('/:id', auth, async (req, res) => {
  try {
    const { amount, currency, category, date, description, isRecurring } = req.body;
    
    // Build update object
    const expenseFields = {};
    if (amount) expenseFields.amount = amount;
    if (currency) expenseFields.currency = currency;
    if (category) expenseFields.category = category;
    if (date) expenseFields.date = new Date(date);
    if (description) expenseFields.description = description;
    if (isRecurring !== undefined) expenseFields.isRecurring = isRecurring;
    
    // Update expense
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: expenseFields },
      { new: true }
    ).populate('category', 'name');
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    res.json(expense);
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete an expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Delete bill image if exists
    if (expense.billImage) {
      const imagePath = path.join(__dirname, '..', expense.billImage);
      try {
        fs.unlinkSync(imagePath);
      } catch (unlinkErr) {
        console.error('Error deleting image file:', unlinkErr);
      }
    }
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get expense summary (totals by category)
router.get('/summary/by-category', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      dateFilter.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      dateFilter.date = { $lte: new Date(endDate) };
    }
    
    // Aggregate expenses by category
    const summary = await Expense.aggregate([
      { 
        $match: { 
          user: req.userId,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $project: {
          _id: 1,
          total: 1,
          count: 1,
          categoryName: '$category.name'
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);
    
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get expense summary by month
router.get('/summary/by-month', auth, async (req, res) => {
  try {
    const { year } = req.query;
    
    // Set default year to current year if not provided
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Aggregate expenses by month
    const summary = await Expense.aggregate([
      {
        $match: {
          user: req.userId,
          date: {
            $gte: new Date(`${targetYear}-01-01`),
            $lte: new Date(`${targetYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          month: '$_id',
          total: 1,
          count: 1
        }
      }
    ]);
    
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Convert currency
router.get('/convert-currency', auth, async (req, res) => {
  try {
    const { amount, from, to } = req.query;
    
    if (!amount || !from || !to) {
      return res.status(400).json({ message: 'Please provide amount, from, and to currencies' });
    }
    
    // Call external currency API
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${from}`,
      { params: { key: process.env.EXCHANGE_RATE_API_KEY } }
    );
    
    if (!response.data || !response.data.rates || !response.data.rates[to]) {
      return res.status(404).json({ message: 'Currency conversion rate not found' });
    }
    
    const rate = response.data.rates[to];
    const convertedAmount = parseFloat(amount) * rate;
    
    res.json({
      amount: parseFloat(amount),
      from,
      to,
      rate,
      convertedAmount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
