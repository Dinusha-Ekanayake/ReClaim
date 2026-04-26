const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const itemsController = require('../controllers/itemsController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Public routes
router.get('/', optionalAuth, itemsController.list);
router.get('/:id', optionalAuth, itemsController.getOne);

// Protected routes
router.post('/',
  authenticate,
  [
    body('type').isIn(['LOST', 'FOUND']),
    body('title').trim().isLength({ min: 5, max: 100 }),
    body('description').trim().isLength({ min: 20, max: 2000 }),
    body('category').notEmpty(),
    body('locationLabel').trim().notEmpty(),
    body('dateLostFound').isISO8601(),
  ],
  validate,
  itemsController.create
);

router.put('/:id', authenticate, itemsController.update);
router.delete('/:id', authenticate, itemsController.remove);
router.patch('/:id/status', authenticate, itemsController.updateStatus);

module.exports = router;
