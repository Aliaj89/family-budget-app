const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

// Upload and scan a bill image
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }
    
    // Get image path
    const imagePath = path.join(__dirname, '../uploads', req.file.filename);
    
    // Use Tesseract.js to extract text from image
    const result = await Tesseract.recognize(
      imagePath,
      'eng', // Language
      { logger: m => console.log(m) } // Optional logger
    );
    
    // Extract text from the image
    const extractedText = result.data.text;
    
    // Simple regex patterns to look for amounts, dates, and possible currency symbols
    const amountPattern = /[$€£]?\s*\d+[.,]\d{2}/g;
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|\d{4}-\d{1,2}-\d{1,2}/g;
    const currencyPattern = /[$€£]/g;
    
    // Try to extract amount
    const amountMatches = extractedText.match(amountPattern);
    let amount = null;
    if (amountMatches && amountMatches.length > 0) {
      // Assuming the largest amount might be the total
      let highestAmount = 0;
      amountMatches.forEach(match => {
        const numericAmount = parseFloat(match.replace(/[$€£\s]/g, '').replace(',', '.'));
        if (numericAmount > highestAmount) {
          highestAmount = numericAmount;
          amount = numericAmount;
        }
      });
    }
    
    // Try to extract date
    const dateMatches = extractedText.match(datePattern);
    let date = null;
    if (dateMatches && dateMatches.length > 0) {
      // Take the first date found
      date = dateMatches[0];
    }
    
    // Try to extract currency
    const currencyMatches = extractedText.match(currencyPattern);
    let currency = null;
    if (currencyMatches && currencyMatches.length > 0) {
      const currencySymbol = currencyMatches[0];
      switch (currencySymbol) {
        case '$':
          currency = 'USD';
          break;
        case '€':
          currency = 'EUR';
          break;
        case '£':
          currency = 'GBP';
          break;
        default:
          currency = req.user.baseCurrency || 'USD';
      }
    } else {
      currency = req.user.baseCurrency || 'USD';
    }
    
    // Return extracted information
    res.json({
      imagePath: `/uploads/${req.file.filename}`,
      extractedText,
      amount,
      date,
      currency
    });
  } catch (err) {
    console.error('Error in bill scanning:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Serve uploaded files
router.get('/files/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads', req.params.filename);
  res.sendFile(filePath);
});

module.exports = router;
