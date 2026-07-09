import express from 'express';
import Portfolio from '../models/Portfolio.js';
import dbConnect from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public: Check if a subdomain is available
router.get('/check-subdomain', async (req, res) => {
  try {
    const { subdomain } = req.query;
    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomain query parameter is required' });
    }
    await dbConnect();
    const existing = await Portfolio.findOne({ subdomain: subdomain.toLowerCase() });
    res.json({ available: !existing });
  } catch (error) {
    console.error('Check subdomain error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Public: Fetch portfolio by subdomain handle
router.get('/u/:username', async (req, res) => {
  try {
    const { username } = req.params;
    await dbConnect();
    
    // Find the portfolio matching the subdomain directly
    const portfolio = await Portfolio.findOne({ subdomain: username.toLowerCase() });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json(portfolio);
  } catch (error) {
    console.error('Fetch portfolio error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Private: Get current user's portfolio(s)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.query;
    await dbConnect();
    
    const query = { user: req.user.userId };
    if (templateId) {
      query.templateId = templateId;
      const portfolio = await Portfolio.findOne(query);
      if (!portfolio) {
        return res.status(404).json({ message: 'No portfolio found for this template' });
      }
      return res.json(portfolio);
    }

    // If no templateId is provided, return all portfolios for this user
    const portfolios = await Portfolio.find(query);
    res.json(portfolios);
  } catch (error) {
    console.error('Fetch my portfolios error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Private: Save or update portfolio
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { templateId, subdomain, data } = req.body;
    
    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomain is required to active a template' });
    }

    await dbConnect();

    // Check if the subdomain is taken by another user
    const existing = await Portfolio.findOne({ 
      subdomain: subdomain.toLowerCase(),
      user: { $ne: req.user.userId }
    });
    if (existing) {
      return res.status(400).json({ error: 'Subdomain is already taken by another user' });
    }

    // Drop the old index if it exists in the collection to prevent unique duplicate key errors
    try {
      await Portfolio.collection.dropIndex('username_1');
    } catch (indexError) {
      // Index might not exist, ignore
    }

    const portfolio = await Portfolio.findOneAndUpdate(
      { user: req.user.userId, templateId },
      { 
        user: req.user.userId,
        username: req.user.username,
        subdomain: subdomain.toLowerCase(),
        templateId,
        data,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Portfolio saved successfully', portfolio });
  } catch (error) {
    console.error('Save portfolio error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Private: Delete portfolio
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await dbConnect();
    const portfolio = await Portfolio.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found or unauthorized' });
    }
    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
