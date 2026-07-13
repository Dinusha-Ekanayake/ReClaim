const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const itemsController = require('../controllers/itemsController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const jwt = require('jsonwebtoken');

const ITEM_TYPES = ['LOST', 'FOUND'];
const ITEM_STATUSES = ['ACTIVE', 'MATCHED', 'CLAIM_PENDING', 'RETURNED', 'CLOSED', 'REJECTED'];
const CATEGORIES = [
  'Electronics', 'Bags & Wallets', 'Clothing & Accessories', 'Jewelry',
  'Keys', 'Documents & Cards', 'Books & Stationery', 'Sports Equipment',
  'Pets', 'Vehicles', 'Musical Instruments', 'Toys & Games', 'Other',
];

const listValidation = [
  query('type').optional().isIn(ITEM_TYPES),
  query('status').optional().isIn(ITEM_STATUSES),
  query('category').optional().isIn(CATEGORIES),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sort').optional().isIn(['createdAt', 'dateLostFound', 'updatedAt']),
  query('order').optional().isIn(['asc', 'desc']),
  query('search').optional().trim().isLength({ max: 100 }),
  query('brand').optional().trim().isLength({ max: 80 }),
  query('color').optional().trim().isLength({ max: 40 }),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
];

const itemFields = [
  body('title').optional().trim().isLength({ min: 5, max: 100 }),
  body('description').optional().trim().isLength({ min: 20, max: 2000 }),
  body('category').optional().isIn(CATEGORIES),
  body('subcategory').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('brand').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('color').optional({ nullable: true }).trim().isLength({ max: 40 }),
  body('size').optional({ nullable: true }).trim().isLength({ max: 40 }),
  body('locationLabel').optional().trim().isLength({ min: 2, max: 160 }),
  body('locationArea').optional({ nullable: true }).trim().isLength({ max: 160 }),
  body('locationLat').optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
  body('locationLng').optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  body('dateLostFound').optional().isISO8601().custom((value) => {
    if (new Date(value).getTime() > Date.now() + 5 * 60 * 1000) throw new Error('Date cannot be in the future');
    return true;
  }),
  body('verificationHints').optional().isArray({ max: 5 }),
  body('verificationHints.*').trim().isLength({ min: 3, max: 200 }),
  body('showContactInfo').optional().isBoolean(),
];

// Public routes
router.get('/', listValidation, validate, optionalAuth, itemsController.list);
router.get('/:id', optionalAuth, itemsController.getOne);

// Protected routes
router.post('/',
  authenticate,
  [
    body('type').isIn(ITEM_TYPES),
    body('title').trim().isLength({ min: 5, max: 100 }),
    body('description').trim().isLength({ min: 20, max: 2000 }),
    body('category').isIn(CATEGORIES),
    body('locationLabel').trim().notEmpty(),
    body('dateLostFound').isISO8601().custom((value) => {
      if (new Date(value).getTime() > Date.now() + 5 * 60 * 1000) throw new Error('Date cannot be in the future');
      return true;
    }),
    ...itemFields.slice(3),
    body('imageUrls').optional().isArray({ max: 5 }),
    body('imageUrls.*').isURL({ protocols: ['https'], require_protocol: true }).custom((value) => {
      if (new URL(value).hostname !== 'res.cloudinary.com') throw new Error('Images must use the configured image service');
      return true;
    }),
    body('imagePublicIds').optional().isArray({ max: 5 }),
    body('imagePublicIds.*').isString().isLength({ min: 1, max: 255 }),
    body('imageUploadTokens').optional().isArray({ max: 5 }),
    body('imageUploadTokens.*').isString().isLength({ min: 20, max: 4000 }),
    body().custom((value, { req }) => {
      const urls = value.imageUrls || [];
      const ids = value.imagePublicIds || [];
      const tokens = value.imageUploadTokens || [];
      if (urls.length !== ids.length || urls.length !== tokens.length) {
        throw new Error('Every image must include a valid upload receipt');
      }
      tokens.forEach((token, index) => {
        const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (payload.purpose !== 'item-upload' || payload.userId !== req.user.id ||
            payload.url !== urls[index] || payload.publicId !== ids[index]) {
          throw new Error('Invalid image upload receipt');
        }
      });
      return true;
    }),
  ],
  validate,
  itemsController.create
);

router.put('/:id', authenticate, itemFields, validate, itemsController.update);
router.delete('/:id', authenticate, itemsController.remove);
router.patch('/:id/status', authenticate, itemsController.updateStatus);

module.exports = router;
