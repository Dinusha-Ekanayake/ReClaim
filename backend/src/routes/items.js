const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const itemsController = require('../controllers/itemsController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { verifyUploadReceipt } = require('../services/pendingUploadService');
const { isValidCalendarDate, validatePastOrTodayCalendarDate } = require('../utils/calendarDate');

const ITEM_TYPES = ['LOST', 'FOUND'];
const ITEM_STATUSES = ['ACTIVE', 'MATCHED', 'CLAIM_PENDING', 'RETURNED', 'CLOSED', 'REJECTED'];
const PUBLIC_ITEM_STATUSES = ['ACTIVE', 'MATCHED', 'CLAIM_PENDING', 'RETURNED', 'CLOSED'];
const CATEGORIES = [
  'Electronics', 'Bags & Wallets', 'Clothing & Accessories', 'Jewelry',
  'Keys', 'Documents & Cards', 'Books & Stationery', 'Sports Equipment',
  'Pets', 'Vehicles', 'Musical Instruments', 'Toys & Games', 'Other',
];

const idValidation = param('id').isUUID().withMessage('Valid item id required');

const isCloudinaryUrl = (value) => {
  if (new URL(value).hostname !== 'res.cloudinary.com') {
    throw new Error('Images must use the configured image service');
  }
  return true;
};

const legacyImageValidation = [
  body('imageUrls').optional().isArray({ max: 5 }),
  body('imageUrls.*')
    .isURL({ protocols: ['https'], require_protocol: true })
    .bail()
    .custom(isCloudinaryUrl),
  body('imagePublicIds').optional().isArray({ max: 5 }),
  body('imagePublicIds.*').isString().isLength({ min: 1, max: 255 }),
  body('imageUploadTokens').optional().isArray({ max: 5 }),
  body('imageUploadTokens.*').isString().isLength({ min: 20, max: 4000 }),
  body().custom((value, { req }) => {
    const urls = value.imageUrls || [];
    const publicIds = value.imagePublicIds || [];
    const tokens = value.imageUploadTokens || [];
    if (urls.length !== publicIds.length || urls.length !== tokens.length) {
      throw new Error('Every image must include a valid upload receipt');
    }

    const receipts = tokens.map((token, index) => verifyUploadReceipt(token, {
      userId: req.user.id,
      url: urls[index],
      publicId: publicIds[index],
    }));
    if (new Set(receipts.map((receipt) => receipt.id)).size !== receipts.length ||
        new Set(publicIds).size !== publicIds.length ||
        new Set(tokens).size !== tokens.length) {
      throw new Error('Duplicate image upload receipts are not allowed');
    }
    return true;
  }),
];

const orderedImageValidation = [
  body('images').optional().isArray({ max: 5 }),
  body('images.*').custom((image) => {
    if (!image || typeof image !== 'object' || Array.isArray(image)) {
      throw new Error('Each image must be an object');
    }
    const keys = Object.keys(image).sort();
    if (image.id !== undefined) {
      if (keys.length !== 1 || keys[0] !== 'id') {
        throw new Error('Existing images must contain only their id');
      }
      return true;
    }
    const expected = ['publicId', 'uploadToken', 'url'];
    if (keys.length !== expected.length || expected.some((key, index) => keys[index] !== key)) {
      throw new Error('New images require url, publicId, and uploadToken');
    }
    return true;
  }),
  body('images.*.id').optional().isUUID(),
  body('images.*.url')
    .optional()
    .isURL({ protocols: ['https'], require_protocol: true })
    .bail()
    .custom(isCloudinaryUrl),
  body('images.*.publicId').optional().isString().isLength({ min: 1, max: 255 }),
  body('images.*.uploadToken').optional().isString().isLength({ min: 20, max: 4000 }),
  body('images').optional().custom((images, { req }) => {
    const existingIds = images.filter((image) => image.id).map((image) => image.id);
    const newImages = images.filter((image) => !image.id);
    const receipts = newImages.map((image) => verifyUploadReceipt(image.uploadToken, {
      userId: req.user.id,
      url: image.url,
      publicId: image.publicId,
    }));
    const unique = (values) => new Set(values).size === values.length;
    if (!unique(existingIds) ||
        !unique(receipts.map((receipt) => receipt.id)) ||
        !unique(newImages.map((image) => image.publicId)) ||
        !unique(newImages.map((image) => image.uploadToken))) {
      throw new Error('Duplicate images are not allowed');
    }
    return true;
  }),
];

const listValidation = [
  query('type').optional().isIn(ITEM_TYPES),
  query('status').optional().isIn(PUBLIC_ITEM_STATUSES),
  query('category').optional().isIn(CATEGORIES),
  query('page').optional().isInt({ min: 1, max: 1000 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sort').optional().isIn(['createdAt', 'dateLostFound', 'updatedAt']),
  query('order').optional().isIn(['asc', 'desc']),
  query('search').optional({ checkFalsy: true }).trim().isLength({ min: 3, max: 100 }),
  query('brand').optional().trim().isLength({ max: 80 }),
  query('color').optional().trim().isLength({ max: 40 }),
  query('dateFrom').optional().custom((value) => {
    if (!isValidCalendarDate(value)) throw new Error('dateFrom must use YYYY-MM-DD');
    return true;
  }),
  query('dateTo').optional().custom((value) => {
    if (!isValidCalendarDate(value)) throw new Error('dateTo must use YYYY-MM-DD');
    return true;
  }),
  query().custom((value) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      throw new Error('dateFrom must be on or before dateTo');
    }
    return true;
  }),
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
  body('dateLostFound').optional().custom(validatePastOrTodayCalendarDate),
  body('verificationHints').optional().isArray({ max: 5 }),
  body('verificationHints.*').trim().isLength({ min: 3, max: 200 }),
  body('verificationQuestions').optional().isArray({ max: 5 }),
  body('verificationQuestions').optional().custom((questions) => {
    const normalized = questions.map((question) => question.trim().normalize('NFKC').toLocaleLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      throw new Error('Ownership questions must be unique');
    }
    return true;
  }),
  body('verificationQuestions.*').trim().isLength({ min: 3, max: 200 }),
  body('showContactInfo').optional().isBoolean(),
  body().custom((value) => {
    const ownsLat = Object.prototype.hasOwnProperty.call(value, 'locationLat');
    const ownsLng = Object.prototype.hasOwnProperty.call(value, 'locationLng');
    const hasLat = ownsLat && value.locationLat !== null && value.locationLat !== '';
    const hasLng = ownsLng && value.locationLng !== null && value.locationLng !== '';
    if (ownsLat !== ownsLng || (ownsLat && hasLat !== hasLng)) {
      throw new Error('Latitude and longitude must be provided or cleared together');
    }
    return true;
  }),
];

// Public routes
router.get('/', listValidation, validate, optionalAuth, itemsController.list);
router.get('/:id', idValidation, validate, optionalAuth, itemsController.getOne);

// Protected routes
router.post('/',
  authenticate,
  [
    body('type').isIn(ITEM_TYPES),
    body('title').trim().isLength({ min: 5, max: 100 }),
    body('description').trim().isLength({ min: 20, max: 2000 }),
    body('category').isIn(CATEGORIES),
    body('locationLabel').trim().notEmpty(),
    body('locationArea').trim().isLength({ min: 2, max: 160 }),
    body('dateLostFound').custom(validatePastOrTodayCalendarDate),
    ...itemFields.slice(3),
    ...legacyImageValidation,
    body().custom((value) => {
      if (value.type === 'FOUND') {
        const questions = value.verificationQuestions || [];
        const legacyHints = value.verificationHints || [];
        if (questions.length === 0 && legacyHints.length === 0) {
          throw new Error('Found items require at least one ownership question');
        }
      }
      return true;
    }),
  ],
  validate,
  itemsController.create
);

router.put('/:id', authenticate, [idValidation, ...itemFields, ...orderedImageValidation], validate, itemsController.update);
router.delete('/:id', authenticate, idValidation, validate, itemsController.remove);
router.patch('/:id/status', authenticate, [
  idValidation,
  // Moderation and matching states are owned by their dedicated workflows.
  body('status').isIn(['RETURNED', 'CLOSED']),
], validate, itemsController.updateStatus);

module.exports = router;
