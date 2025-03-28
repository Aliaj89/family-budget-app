const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Create Express application
const app = express();

// Import models
const { Expense, RecurringExpense, Category, User } = require('./models');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL || 'https://family-budget-app-aliaj89.netlify.app' 
    : 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport initialization
require('./config/passport');
app.use(passport.initialize());

// Serve static files from 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const categoryRoutes = require('./routes/categories');
const recurringExpenseRoutes = require('./routes/recurring-expenses');
const uploadRoutes = require('./routes/upload');
const syncRoutes = require('./routes/sync');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/recurring-expenses', recurringExpenseRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/sync', syncRoutes);

// Setup default categories function
const setupDefaultCategories = async () => {
  try {
    // Check if any categories exist
    const categoriesCount = await Category.countDocuments();
    
    if (categoriesCount === 0) {
      console.log('Setting up default categories...');
      
      // Define main categories with subcategories
      const defaultCategories = [
        {
          name: 'Housing',
          subcategories: [
            'Rent/Mortgage', 'Property Taxes', 'Home Insurance', 
            'Home Maintenance/Repairs', 'HOA Fees'
          ]
        },
        {
          name: 'Utilities',
          subcategories: [
            'Electricity', 'Water', 'Gas', 'Internet', 'Phone', 
            'Cable/Satellite TV', 'Trash/Recycling'
          ]
        },
        {
          name: 'Food',
          subcategories: [
            'Groceries', 'Dining Out', 'Takeout/Delivery', 'Coffee/Snacks'
          ]
        },
        {
          name: 'Transportation',
          subcategories: [
            'Car Payments', 'Gas', 'Car Insurance', 'Car Maintenance/Repairs', 
            'Public Transit', 'Parking', 'Tolls', 'Rideshare/Taxi'
          ]
        },
        {
          name: 'Health',
          subcategories: [
            'Health Insurance Premiums', 'Doctor Visits', 'Prescriptions', 
            'Dental Care', 'Vision Care', 'Gym Memberships', 'Wellness'
          ]
        },
        {
          name: 'Personal',
          subcategories: [
            'Clothing', 'Shoes', 'Accessories', 'Grooming', 'Entertainment', 
            'Hobbies', 'Subscriptions', 'Education'
          ]
        },
        {
          name: 'Debt',
          subcategories: [
            'Credit Card Payments', 'Student Loans', 'Personal Loans', 
            'Other Debt Payments'
          ]
        },
        {
          name: 'Savings',
          subcategories: [
            'Emergency Fund', 'Retirement Accounts', 'Investments', 
            'College Savings', 'Vacation Fund'
          ]
        },
        {
          name: 'Miscellaneous',
          subcategories: [
            'Gifts', 'Donations', 'Pet Care', 'Childcare', 'School Supplies', 
            'Toys/Games', 'Household Supplies', 'Home Decor', 'Electronics', 
            'Travel', 'Taxes', 'Legal Fees', 'Bank Fees', 'Other Expenses'
          ]
        }
      ];
      
      // First create main categories
      for (const category of defaultCategories) {
        const newMainCategory = new Category({
          name: category.name,
          description: `${category.name} expenses`,
          user: null // System default
        });
        
        const savedMainCategory = await newMainCategory.save();
        
        // Create subcategories
        for (const subName of category.subcategories) {
          const newSubcategory = new Category({
            name: subName,
            description: `${subName} (${category.name})`,
            parent: savedMainCategory._id,
            user: null // System default
          });
          
          await newSubcategory.save();
        }
      }
      
      console.log('Default categories created successfully');
    }
  } catch (err) {
    console.error('Error setting up default categories:', err);
  }
};

// Setup recurring expenses automation
const processRecurringExpenses = async () => {
  try {
    console.log('Processing recurring expenses...');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow
    
    // Find recurring expenses due today
    const dueExpenses = await RecurringExpense.find({
      nextOccurrence: { $gte: today, $lt: tomorrow },
      $or: [
        { endDate: null },
        { endDate: { $gt: today } }
      ]
    }).populate('user');
    
    console.log(`Found ${dueExpenses.length} recurring expenses due today`);
    
    // Process each due expense
    for (const recurringExpense of dueExpenses) {
      // Create a regular expense from this recurring one
      const newExpense = new Expense({
        amount: recurringExpense.amount,
        currency: recurringExpense.currency,
        category: recurringExpense.category,
        date: new Date(), // Today
        description: `${recurringExpense.description} (Recurring)`,
        isRecurring: true,
        user: recurringExpense.user._id
      });
      
      await newExpense.save();
      
      // Calculate next occurrence date
      let nextDate = new Date(recurringExpense.nextOccurrence);
      
      switch (recurringExpense.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
      
      // Update next occurrence
      recurringExpense.nextOccurrence = nextDate;
      await recurringExpense.save();
      
      console.log(`Processed recurring expense: ${recurringExpense._id}`);
    }
  } catch (err) {
    console.error('Error processing recurring expenses:', err);
  }
};

// Configure email for budget alerts
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Check budget alerts
const checkBudgetAlerts = async () => {
  try {
    console.log('Checking budget alerts...');
    
    // This would require a Budget model and thresholds
    // For now, we'll use a simplified approach based on categories
    
    // Get all users
    const users = await User.find({});
    
    // For each user, check category totals for the current month
    for (const user of users) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Get category totals for this month
      const categoryTotals = await Expense.aggregate([
        {
          $match: {
            user: user._id,
            date: {
              $gte: firstDayOfMonth,
              $lte: lastDayOfMonth
            }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryDetails'
          }
        },
        {
          $unwind: '$categoryDetails'
        }
      ]);
      
      // In a real app, you would have a budget limit for each category
      // For demonstration, we'll use fixed thresholds
      const BUDGET_THRESHOLDS = {
        'Housing': 1500,
        'Food': 600,
        'Transportation': 400,
        'Utilities': 300
      };
      
      // Check if any category exceeds 90% of its threshold
      const alertsToSend = [];
      
      for (const category of categoryTotals) {
        const categoryName = category.categoryDetails.name;
        const threshold = BUDGET_THRESHOLDS[categoryName];
        
        if (threshold && category.total >= threshold * 0.9) {
          const percentUsed = Math.round((category.total / threshold) * 100);
          
          alertsToSend.push({
            category: categoryName,
            spent: category.total,
            threshold,
            percentUsed
          });
        }
      }
      
      // Send email if any alerts
      if (alertsToSend.length > 0 && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = createTransporter();
        
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'Budget Alert: Categories approaching limits',
          html: `
            <h2>Budget Alert</h2>
            <p>The following categories are approaching or exceeding their monthly budget:</p>
            <ul>
              ${alertsToSend.map(alert => `
                <li>
                  <strong>${alert.category}:</strong> $${alert.spent.toFixed(2)} / $${alert.threshold} 
                  (${alert.percentUsed}% of budget)
                </li>
              `).join('')}
            </ul>
            <p>Log in to your budget app to review your expenses.</p>
          `
        };
        
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error sending budget alert email:', error);
          } else {
            console.log('Budget alert email sent:', info.response);
          }
        });
      }
    }
  } catch (err) {
    console.error('Error checking budget alerts:', err);
  }
};

// Schedule recurring tasks
// Run recurring expenses check daily at midnight
cron.schedule('0 0 * * *', processRecurringExpenses);

// Run budget alerts check every Monday at 9am
cron.schedule('0 9 * * 1', checkBudgetAlerts);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB database');
    setupDefaultCategories();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.log('Continuing with limited functionality...');
  });

// Production setup
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React frontend app
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Anything that doesn't match the above, send back index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
