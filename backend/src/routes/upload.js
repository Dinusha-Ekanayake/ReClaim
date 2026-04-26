const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload, uploadToCloudinary, uploadAvatar } = require('../services/cloudinaryService');

// POST /api/upload/images — upload up to 5 item images
router.post('/images', authenticate, upload.array('images', 5), async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const uploads = await Promise.all(
      req.files.map(file => uploadToCloudinary(file.buffer))
    );

    res.json({ images: uploads });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/avatar
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const { url, publicId } = await uploadAvatar(req.file.buffer);
    res.json({ url, publicId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
