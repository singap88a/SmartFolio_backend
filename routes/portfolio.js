import express from 'express';
import Portfolio from '../models/Portfolio.js';
import dbConnect from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public: Fetch portfolio by username or subdomain handle
router.get('/u/:username', async (req, res) => {
  try {
    const { username } = req.params;
    await dbConnect();
    
    // Import User model dynamically to prevent circular dependencies
    const User = (await import('../models/User.js')).default;
    const targetUser = await User.findOne({ 
      $or: [
        { username: username }, 
        { subdomain: username.toLowerCase() }
      ] 
    });
    
    if (!targetUser) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    const portfolio = await Portfolio.findOne({ user: targetUser._id });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json(portfolio);
  } catch (error) {
    console.error('Fetch portfolio error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Private: Get current user's portfolio
router.get('/my', authMiddleware, async (req, res) => {
  try {
    await dbConnect();
    const portfolio = await Portfolio.findOne({ user: req.user.userId });
    if (!portfolio) {
      return res.status(404).json({ message: 'No portfolio found' });
    }
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Private: Save or update portfolio
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { templateId, data } = req.body;
    await dbConnect();

    const portfolio = await Portfolio.findOneAndUpdate(
      { user: req.user.userId },
      { 
        user: req.user.userId,
        username: req.user.username,
        templateId,
        data,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Portfolio saved successfully', portfolio });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
