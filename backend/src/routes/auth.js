const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post('/register',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 chars'),
    body('email').isEmail().normalizeEmail().isLength({ max: 254 }).withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters')
      .custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password must be at most 72 bytes')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and a number'),
  ],
  validate,
  authController.register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail().isLength({ max: 254 }),
    body('password').isString().isLength({ min: 1, max: 128 }),
  ],
  validate,
  authController.login
);

router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail().isLength({ max: 254 }).withMessage('Valid email required')],
  validate,
  authController.forgotPassword
);

router.post('/reset-password',
  [
    body('token').isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('Invalid reset token'),
    body('password')
      .isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters')
      .custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password must be at most 72 bytes')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and a number'),
  ],
  validate,
  authController.resetPassword
);

router.post('/verify-email',
  [body('token').isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('Invalid verification token')],
  validate,
  authController.verifyEmail
);

router.post('/resend-verification',
  [body('email').isEmail().normalizeEmail().isLength({ max: 254 }).withMessage('Valid email required')],
  validate,
  authController.resendVerification
);

router.post('/refresh', authController.requireTrustedOrigin, authController.refresh);
router.post('/logout', authController.requireTrustedOrigin, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
