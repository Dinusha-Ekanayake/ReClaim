const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const prisma = require('../lib/prisma');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');
const jwt = require('jsonwebtoken');

// POST /api/upload/images — upload up to 5 item images
router.post('/images', authenticate, upload.array('images', 5), async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const results = await Promise.allSettled(
      req.files.map(file => uploadToCloudinary(file.buffer))
    );
    const uploads = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    const failed = results.find(result => result.status === 'rejected');

    if (failed) {
      await Promise.all(uploads.map(image => deleteFromCloudinary(image.publicId)));
      throw failed.reason;
    }

    res.json({
      images: uploads.map((image) => ({
        ...image,
        uploadToken: jwt.sign(
          { purpose: 'item-upload', userId: req.user.id, url: image.url, publicId: image.publicId },
          process.env.JWT_SECRET,
          { expiresIn: '1h', algorithm: 'HS256' }
        ),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/upload/images — clean up signed uploads that were never attached to an item
router.delete('/images', authenticate, [
  body('uploads').isArray({ min: 1, max: 5 }),
  body('uploads.*.publicId').isString().isLength({ min: 1, max: 255 }),
  body('uploads.*.uploadToken').isString().isLength({ min: 20, max: 4000 }),
], validate, async (req, res, next) => {
  try {
    const verifiedPublicIds = [];

    for (const uploadReceipt of req.body.uploads) {
      let payload;
      try {
        payload = jwt.verify(uploadReceipt.uploadToken, process.env.JWT_SECRET, {
          algorithms: ['HS256'],
        });
      } catch {
        return res.status(400).json({ error: 'An upload receipt is invalid or has expired' });
      }

      if (
        payload.purpose !== 'item-upload' ||
        payload.userId !== req.user.id ||
        payload.publicId !== uploadReceipt.publicId
      ) {
        return res.status(403).json({ error: 'Upload receipt does not belong to this account' });
      }

      verifiedPublicIds.push(uploadReceipt.publicId);
    }

    const uniquePublicIds = [...new Set(verifiedPublicIds)];
    const attached = await prisma.itemImage.findMany({
      where: { publicId: { in: uniquePublicIds } },
      select: { publicId: true },
    });
    const attachedIds = new Set(attached.map(image => image.publicId));
    const orphanedIds = uniquePublicIds.filter(publicId => !attachedIds.has(publicId));

    await Promise.all(orphanedIds.map(deleteFromCloudinary));
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
