// Export all models from a single file for easier imports
const User = require('./User');
const Category = require('./Category');
const Expense = require('./Expense');
const RecurringExpense = require('./RecurringExpense');

module.exports = {
  User,
  Category,
  Expense,
  RecurringExpense
};
