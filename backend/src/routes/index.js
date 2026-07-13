const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const userRoutes = require('./users');
const itemRoutes = require('./items');
const uploadRoutes = require('./upload');
const matchRoutes = require('./matches');
const chatRoutes = require('./chats');
const claimRoutes = require('./claims');
const commentRoutes = require('./comments');
const notificationRoutes = require('./notifications');
const reportRoutes = require('./reports');
const adminRoutes = require('./admin');
const statsRoutes = require('./stats');
const contactRoutes = require('./contact');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/items', itemRoutes);
router.use('/upload', uploadRoutes);
router.use('/matches', matchRoutes);
router.use('/chats', chatRoutes);
router.use('/claims', claimRoutes);
router.use('/comments', commentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/stats', statsRoutes);
router.use('/contact', contactRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
