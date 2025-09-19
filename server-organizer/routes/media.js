const express = require('express');
const { cloudinary } = require('../utils/cloudinary');
const { authenticateSupabaseToken } = require('../middleware/supabaseAuth');

const router = express.Router();

// @route   GET /api/media/config
// @desc    Get Cloudinary configuration for frontend
// @access  Public
router.get('/config', (req, res) => {
  try {
    const config = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folderDefault: 'joli'
    };

    res.json(config);
  } catch (error) {
    console.error('Error getting Cloudinary config:', error);
    res.status(500).json({ error: 'Failed to get upload configuration' });
  }
});

// @route   POST /api/media/sign-upload
// @desc    Generate upload signature for Cloudinary
// @access  Public
router.post('/sign-upload', (req, res) => {
  try {
    const { timestamp, ...params } = req.body;
    
    // Include timestamp in the parameters to be signed
    const paramsToSign = {
      timestamp,
      ...params
    };
    
    // Generate signature
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({ signature });
  } catch (error) {
    console.error('Error generating upload signature:', error);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

module.exports = router;