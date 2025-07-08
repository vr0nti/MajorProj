const Chat = require('../models/Chat');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

// Create or get chat room
exports.createOrGetChat = async (req, res) => {
  try {
    const { participantId, chatType = 'one-on-one' } = req.body;

    if (chatType === 'one-on-one') {
      // Check if chat already exists between these two users
      const existingChat = await Chat.findOne({
        chatType: 'one-on-one',
        participants: { $all: [req.user._id, participantId] },
        participants: { $size: 2 }
      });

      if (existingChat) {
        return res.json({ chat: existingChat });
      }

      // Create new one-on-one chat
      const newChat = new Chat({
        chatType: 'one-on-one',
        participants: [req.user._id, participantId]
      });

      await newChat.save();
      res.status(201).json({ chat: newChat });
    } else {
      // Group chat logic
      const { groupName, groupDescription, participants } = req.body;

      const newChat = new Chat({
        chatType: 'group',
        participants: [req.user._id, ...participants],
        groupName,
        groupDescription,
        groupAdmin: req.user._id
      });

      await newChat.save();
      res.status(201).json({ chat: newChat });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content, messageType = 'text', fileUrl, fileName, fileSize } = req.body;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    // Check if user is blocked
    const isBlocked = chat.blockedUsers.some(block => 
      block.user.toString() === req.user._id.toString()
    );
    if (isBlocked) {
      return res.status(403).json({ message: 'You are blocked from this chat' });
    }

    const message = new ChatMessage({
      sender: req.user._id,
      receiver: chat.participants.find(p => p.toString() !== req.user._id.toString()),
      chatRoom: chatId,
      messageType,
      content,
      fileUrl,
      fileName,
      fileSize
    });

    await message.save();

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      lastMessageAt: Date.now()
    });

    // Increment unread count for other participants
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        const currentCount = chat.unreadCount.get(participantId.toString()) || 0;
        chat.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });

    await chat.save();

    const populatedMessage = await ChatMessage.findById(message._id)
      .populate('sender', 'name email')
      .populate('receiver', 'name email');

    res.status(201).json({ message: populatedMessage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get chat messages
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    const messages = await ChatMessage.find({ 
      chatRoom: chatId,
      isDeleted: false 
    })
    .populate('sender', 'name email')
    .populate('receiver', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Mark messages as read
    await ChatMessage.updateMany(
      { 
        chatRoom: chatId, 
        receiver: req.user._id, 
        status: { $ne: 'read' } 
      },
      { 
        status: 'read', 
        readAt: Date.now() 
      }
    );

    // Reset unread count for this user
    chat.unreadCount.set(req.user._id.toString(), 0);
    await chat.save();

    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get user's chats
exports.getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
      isActive: true
    })
    .populate('participants', 'name email role')
    .populate('lastMessage')
    .populate('groupAdmin', 'name')
    .sort({ lastMessageAt: -1 });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete their own message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    message.isDeleted = true;
    message.deletedAt = Date.now();
    message.deletedBy = req.user._id;
    await message.save();

    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mute/unmute chat
exports.toggleMuteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    const isMuted = chat.mutedBy.some(mute => 
      mute.user.toString() === req.user._id.toString()
    );

    if (isMuted) {
      // Unmute
      chat.mutedBy = chat.mutedBy.filter(mute => 
        mute.user.toString() !== req.user._id.toString()
      );
    } else {
      // Mute
      chat.mutedBy.push({
        user: req.user._id,
        mutedAt: Date.now()
      });
    }

    await chat.save();
    res.json({ 
      message: isMuted ? 'Chat unmuted' : 'Chat muted',
      isMuted: !isMuted 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Block/unblock user
exports.toggleBlockUser = async (req, res) => {
  try {
    const { chatId, userId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    const isBlocked = chat.blockedUsers.some(block => 
      block.user.toString() === userId
    );

    if (isBlocked) {
      // Unblock
      chat.blockedUsers = chat.blockedUsers.filter(block => 
        block.user.toString() !== userId
      );
    } else {
      // Block
      chat.blockedUsers.push({
        user: userId,
        blockedBy: req.user._id,
        blockedAt: Date.now()
      });
    }

    await chat.save();
    res.json({ 
      message: isBlocked ? 'User unblocked' : 'User blocked',
      isBlocked: !isBlocked 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Search messages
exports.searchMessages = async (req, res) => {
  try {
    const { query, chatId } = req.query;

    let searchQuery = {
      content: { $regex: query, $options: 'i' },
      isDeleted: false
    };

    if (chatId) {
      searchQuery.chatRoom = chatId;
    }

    const messages = await ChatMessage.find(searchQuery)
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .populate('chatRoom', 'groupName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 