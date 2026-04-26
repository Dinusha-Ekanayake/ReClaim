// const express = require('express');
// const router = express.Router();

// router.use('/auth', require('./routes/auth'));
// router.use('/users', require('./routes/users'));
// router.use('/items', require('./routes/items'));
// router.use('/matches', require('./routes/matches'));
// router.use('/chats', require('./routes/chats'));
// router.use('/comments', require('./routes/comments'));
// router.use('/claims', require('./routes/claims'));
// router.use('/notifications', require('./routes/notifications'));
// router.use('/reports', require('./routes/reports'));
// router.use('/admin', require('./routes/admin'));
// router.use('/upload', require('./routes/upload'));

// module.exports = router;

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
router.use('/admin', adminRoutes);

module.exports = router;
