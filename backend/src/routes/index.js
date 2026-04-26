const express = require('express');
const router = express.Router();

router.use('/auth', require('./routes/auth'));
router.use('/users', require('./routes/users'));
router.use('/items', require('./routes/items'));
router.use('/matches', require('./routes/matches'));
router.use('/chats', require('./routes/chats'));
router.use('/comments', require('./routes/comments'));
router.use('/claims', require('./routes/claims'));
router.use('/notifications', require('./routes/notifications'));
router.use('/reports', require('./routes/reports'));
router.use('/admin', require('./routes/admin'));
router.use('/upload', require('./routes/upload'));

module.exports = router;
