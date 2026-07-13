const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const prisma = require('../lib/prisma');
const { upload, uploadToCloudinary } = require('../services/cloudinaryService');
const {
  cleanupPendingUploads,
  createPendingDescriptor,
  schedulePendingUploadCleanup,
  signUploadReceipt,
  verifyUploadReceipt,
} = require('../services/pendingUploadService');

// POST /api/upload/images — upload up to 5 item images
router.post('/images', authenticate, upload.array('images', 5), async (req, res, next) => {
  let descriptors = [];
  let pendingRegistered = false;
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No images provided' });
    }

    // Register ownership before touching the external asset service. If the
    // process fails after upload, the durable row still gives cleanup a publicId.
    descriptors = req.files.map(() => createPendingDescriptor(req.user.id));
    await prisma.pendingUpload.createMany({
      data: descriptors.map((descriptor) => ({ ...descriptor, url: null })),
    });
    pendingRegistered = true;

    const results = await Promise.allSettled(
      req.files.map((file, index) => uploadToCloudinary(file.buffer, {
        publicId: descriptors[index].publicId,
      }))
    );
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;

    const uploaded = results.map((result, index) => {
      const image = result.value;
      if (image.publicId !== descriptors[index].publicId) {
        const error = new Error('Image service returned an unexpected asset identifier');
        error.status = 502;
        throw error;
      }
      return image;
    });

    const ready = await prisma.$transaction(uploaded.map((image, index) =>
      prisma.pendingUpload.update({
        where: { id: descriptors[index].id },
        data: { url: image.url },
        select: { id: true, userId: true, url: true, publicId: true, expiresAt: true },
      })
    ));

    res.json({
      images: ready.map((image) => ({
        url: image.url,
        publicId: image.publicId,
        uploadToken: signUploadReceipt(image),
      })),
    });

    void schedulePendingUploadCleanup().catch(() => {});
  } catch (err) {
    if (pendingRegistered && descriptors.length) {
      const ids = descriptors.map((descriptor) => descriptor.id);
      await prisma.pendingUpload.updateMany({
        where: { id: { in: ids } },
        data: { expiresAt: new Date() },
      }).catch(() => {});
      void cleanupPendingUploads({ ids, limit: ids.length }).catch(() => {});
    }
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
    const receipts = req.body.uploads.map((uploadReceipt) => verifyUploadReceipt(
      uploadReceipt.uploadToken,
      { userId: req.user.id, publicId: uploadReceipt.publicId }
    ));
    const ids = [...new Set(receipts.map((receipt) => receipt.id))];
    if (ids.length !== receipts.length) {
      return res.status(400).json({ error: 'Duplicate upload receipts are not allowed' });
    }

    // Only still-pending rows can be claimed for cleanup. Consumed receipts no
    // longer have such a row, so replay can never delete an attached image.
    const cleanup = await cleanupPendingUploads({ ids, userId: req.user.id, limit: ids.length });
    if (cleanup.failed) {
      return res.status(503).json({ error: 'Some images could not be removed. Please retry.' });
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
