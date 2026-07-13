const express = require('express');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.post('/', [
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('email').trim().isEmail().normalizeEmail().isLength({ max: 254 }),
  body('subject').trim().isLength({ min: 3, max: 120 }),
  body('message').trim().isLength({ min: 10, max: 3000 }),
  body('website').optional({ nullable: true }).isString().isLength({ max: 200 }),
], validate, async (req, res, next) => {
  try {
    // Honeypot: automated form fillers receive a normal response but create no data.
    if (req.body.website) return res.status(202).json({ message: 'Message received' });

    const message = await prisma.contactMessage.create({
      data: {
        name: req.body.name,
        email: req.body.email,
        subject: req.body.subject,
        message: req.body.message,
      },
      select: { id: true, createdAt: true },
    });

    res.status(201).json({ message: 'Message received', reference: message.id, createdAt: message.createdAt });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
