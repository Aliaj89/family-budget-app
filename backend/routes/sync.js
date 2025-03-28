const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { google } = require('googleapis');
const { Expense, Category } = require('../models');

// Sync expenses to Google Sheets
router.post('/sheets', auth, async (req, res) => {
  try {
    // Check if user has Google credentials
    if (!req.user.accessToken) {
      return res.status(400).json({ 
        message: 'Google credentials not found. Please reconnect your Google account' 
      });
    }

    // Create auth client using user's tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: req.user.accessToken,
      refresh_token: req.user.refreshToken
    });

    // Create sheets API client
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Get the sheet ID from environment variables
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    if (!spreadsheetId) {
      return res.status(500).json({ message: 'Google Sheet ID not configured' });
    }

    // Get expenses to sync (either specific IDs from request or all user expenses)
    const { expenseIds } = req.body;
    let expenses;

    if (expenseIds && expenseIds.length > 0) {
      // Get specific expenses
      expenses = await Expense.find({
        _id: { $in: expenseIds },
        user: req.userId
      }).populate('category', 'name');
    } else {
      // Get all expenses for user
      expenses = await Expense.find({
        user: req.userId
      }).populate('category', 'name').limit(100); // Limit to prevent too many rows at once
    }

    if (expenses.length === 0) {
      return res.status(404).json({ message: 'No expenses found to sync' });
    }

    // Format expense data for sheets
    const values = expenses.map(expense => [
      expense.date.toISOString().split('T')[0], // Date in YYYY-MM-DD format
      expense.category.name,
      expense.amount.toString(),
      expense.currency,
      expense.description,
      expense.isRecurring ? 'Yes' : 'No'
    ]);

    // Check if sheet exists and create headers if needed
    try {
      await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Family Budget!A1:F1',
      });
    } catch (error) {
      // If sheet doesn't exist or has no headers, create them
      if (error.code === 404 || error.message.includes('Unable to parse range')) {
        // Create a new sheet named 'Family Budget'
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'Family Budget',
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 6
                    }
                  }
                }
              }
            ]
          }
        });

        // Add headers
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Family Budget!A1:F1',
          valueInputOption: 'RAW',
          resource: {
            values: [['Date', 'Category', 'Amount', 'Currency', 'Description', 'Is Recurring']]
          }
        });

        // Format headers (bold)
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 1
                  },
                  cell: {
                    userEnteredFormat: {
                      textFormat: {
                        bold: true
                      }
                    }
                  },
                  fields: 'userEnteredFormat.textFormat.bold'
                }
              }
            ]
          }
        });
      } else {
        throw error; // Re-throw if it's a different error
      }
    }

    // Find the next available row
    let nextRow = 2; // Start after headers
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Family Budget!A:A',
      });

      if (response.data.values) {
        nextRow = response.data.values.length + 1;
      }
    } catch (error) {
      console.error('Error finding next row:', error);
      // Continue with row 2 if there's an error
    }

    // Append expense data to sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Family Budget!A${nextRow}:F${nextRow + values.length - 1}`,
      valueInputOption: 'RAW',
      resource: {
        values
      }
    });

    // Apply some basic formatting and calculations
    try {
      // Auto-resize columns for better visibility
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 6
                }
              }
            }
          ]
        }
      });

      // Add summary calculations at the bottom
      const lastRow = nextRow + values.length + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Family Budget!A${lastRow}:B${lastRow + 3}`,
        valueInputOption: 'USER_ENTERED', // Use USER_ENTERED for formulas
        resource: {
          values: [
            ['Total Expenses (Base Currency)', `=SUMIF(D2:D${lastRow - 1}, "USD", C2:C${lastRow - 1})`],
            ['Monthly Average', `=AVERAGE(C2:C${lastRow - 1})`],
            ['Highest Expense', `=MAX(C2:C${lastRow - 1})`],
            ['Number of Expenses', `=COUNT(C2:C${lastRow - 1})`]
          ]
        }
      });
    } catch (error) {
      console.error('Error applying formatting:', error);
      // Continue even if formatting fails
    }

    res.json({
      message: 'Expenses successfully synced to Google Sheets',
      syncedExpenses: expenses.length,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    });
  } catch (err) {
    console.error('Error syncing to Google Sheets:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
