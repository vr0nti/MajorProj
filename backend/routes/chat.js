const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middlewares/auth');

// All routes require authentication
router.use(auth);

// Chat management routes
router.post('/create', chatController.createOrGetChat);
router.get('/user-chats', chatController.getUserChats);
router.get('/messages/:chatId', chatController.getChatMessages);
router.post('/send-message', chatController.sendMessage);
router.delete('/message/:messageId', chatController.deleteMessage);

// Chat settings
router.put('/mute/:chatId', chatController.toggleMuteChat);
router.put('/block/:chatId/:userId', chatController.toggleBlockUser);

// Search
router.get('/search', chatController.searchMessages);

module.exports = router; 