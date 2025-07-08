const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const ChatMessage = require('../models/ChatMessage');
const Notice = require('../models/Notice');
const Complaint = require('../models/Complaint');

const chatSocketHandler = (io) => {
  // Store online users
  const onlineUsers = new Map();
  const userSockets = new Map();

  // Authentication middleware
  const authenticateSocket = async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      return user;
    } catch (error) {
      return null;
    }
  };

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const user = await authenticateSocket(token);
    if (!user) {
      return next(new Error('Authentication error'));
    }

    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user._id})`);

    // Add user to online users
    onlineUsers.set(socket.user._id.toString(), {
      id: socket.user._id,
      name: socket.user.name,
      role: socket.user.role,
      department: socket.user.department
    });

    // Store socket reference
    if (!userSockets.has(socket.user._id.toString())) {
      userSockets.set(socket.user._id.toString(), []);
    }
    userSockets.get(socket.user._id.toString()).push(socket.id);

    // Join user to their personal room
    socket.join(`user_${socket.user._id}`);

    // Join department room if user has department
    if (socket.user.department) {
      socket.join(`department_${socket.user.department}`);
    }

    // Join role-based room
    socket.join(`role_${socket.user.role}`);

    // Broadcast online status
    socket.broadcast.emit('user_online', {
      userId: socket.user._id,
      name: socket.user.name,
      role: socket.user.role
    });

    // Send online users list to the connected user
    socket.emit('online_users', Array.from(onlineUsers.values()));

    // Handle joining a specific chat
    socket.on('join_chat', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.includes(socket.user._id)) {
          socket.join(`chat_${chatId}`);
          socket.emit('chat_joined', { chatId });
        }
      } catch (error) {
        console.error('Error joining chat:', error);
      }
    });

    // Handle leaving a chat
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      socket.emit('chat_left', { chatId });
    });

    // Handle sending a message
    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, messageType = 'text', fileUrl, fileName, fileSize } = data;

        // Verify user is part of the chat
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(socket.user._id)) {
          socket.emit('error', { message: 'Not authorized to send message to this chat' });
          return;
        }

        // Create new message
        const message = new ChatMessage({
          chat: chatId,
          sender: socket.user._id,
          content,
          messageType,
          fileUrl,
          fileName,
          fileSize
        });

        await message.save();

        // Populate sender info
        await message.populate('sender', 'name email');

        // Update chat's last message
        chat.lastMessage = message._id;
        chat.lastMessageAt = new Date();
      await chat.save();

        // Broadcast message to chat room
        io.to(`chat_${chatId}`).emit('new_message', {
          message,
          chatId
        });

        // Send notification to offline participants
        const offlineParticipants = chat.participants.filter(
          participantId => !onlineUsers.has(participantId.toString())
        );

        offlineParticipants.forEach(participantId => {
          io.to(`user_${participantId}`).emit('message_notification', {
            chatId,
            sender: socket.user.name,
            content: content.length > 50 ? content.substring(0, 50) + '...' : content,
            messageType
          });
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing_start', (chatId) => {
      socket.to(`chat_${chatId}`).emit('user_typing', {
        chatId,
        userId: socket.user._id,
        userName: socket.user.name
      });
    });

    socket.on('typing_stop', (chatId) => {
      socket.to(`chat_${chatId}`).emit('user_stopped_typing', {
        chatId,
        userId: socket.user._id
      });
    });

    // Handle message read receipts
    socket.on('mark_read', async (data) => {
      try {
        const { chatId, messageIds } = data;

        // Update message read status
        await ChatMessage.updateMany(
          { _id: { $in: messageIds }, sender: { $ne: socket.user._id } },
          { $addToSet: { readBy: socket.user._id } }
        );

        // Notify message sender
        const messages = await ChatMessage.find({ _id: { $in: messageIds } });
        messages.forEach(message => {
          if (message.sender.toString() !== socket.user._id.toString()) {
            io.to(`user_${message.sender}`).emit('message_read', {
              messageId: message._id,
              readBy: socket.user._id,
              readAt: new Date()
            });
          }
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle notice notifications
    socket.on('subscribe_notices', () => {
      socket.join('notices');
    });

    socket.on('unsubscribe_notices', () => {
      socket.leave('notices');
    });

    // Handle complaint notifications
    socket.on('subscribe_complaints', () => {
      socket.join('complaints');
    });

    socket.on('unsubscribe_complaints', () => {
      socket.leave('complaints');
    });

    // Handle real-time status updates
    socket.on('update_status', async (status) => {
      try {
        await User.findByIdAndUpdate(socket.user._id, { status });
        
        // Update online users map
        const userInfo = onlineUsers.get(socket.user._id.toString());
        if (userInfo) {
          userInfo.status = status;
          onlineUsers.set(socket.user._id.toString(), userInfo);
        }

        // Broadcast status update
        socket.broadcast.emit('user_status_update', {
          userId: socket.user._id,
          status
        });

      } catch (error) {
        console.error('Error updating status:', error);
      }
    });

    // Handle file upload progress
    socket.on('file_upload_progress', (data) => {
      socket.to(`chat_${data.chatId}`).emit('file_upload_progress', {
        chatId: data.chatId,
        fileName: data.fileName,
        progress: data.progress
      });
    });

    // Handle call signaling (for future video/audio calls)
    socket.on('call_signal', (data) => {
      const { targetUserId, signal, type } = data;
      
      io.to(`user_${targetUserId}`).emit('incoming_call', {
        from: socket.user._id,
        fromName: socket.user.name,
        signal,
        type
      });
    });

    socket.on('call_response', (data) => {
      const { targetUserId, accepted, signal } = data;
      
      io.to(`user_${targetUserId}`).emit('call_response', {
        from: socket.user._id,
        accepted,
        signal
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.user._id})`);

      // Remove socket from user's socket list
      const userSocketList = userSockets.get(socket.user._id.toString());
      if (userSocketList) {
        const index = userSocketList.indexOf(socket.id);
        if (index > -1) {
          userSocketList.splice(index, 1);
        }

        // If no more sockets for this user, remove from online users
        if (userSocketList.length === 0) {
          onlineUsers.delete(socket.user._id.toString());
          userSockets.delete(socket.user._id.toString());

          // Broadcast offline status
          socket.broadcast.emit('user_offline', {
            userId: socket.user._id,
            name: socket.user.name
          });
        }
      }
    });
  });

  // Helper function to send notice notifications
  const sendNoticeNotification = async (notice) => {
    try {
      const notificationData = {
        type: 'notice',
        title: notice.title,
        content: notice.content.substring(0, 100) + '...',
        category: notice.category,
        priority: notice.priority,
        createdAt: notice.createdAt
      };

      // Send to specific departments if targeted
      if (notice.targetDepartments && notice.targetDepartments.length > 0) {
        notice.targetDepartments.forEach(deptId => {
          io.to(`department_${deptId}`).emit('new_notice', notificationData);
        });
      } else {
        // Send to all users
        io.emit('new_notice', notificationData);
      }
    } catch (error) {
      console.error('Error sending notice notification:', error);
    }
  };

  // Helper function to send complaint notifications
  const sendComplaintNotification = async (complaint) => {
    try {
      const notificationData = {
        type: 'complaint',
        title: complaint.title,
        trackingNumber: complaint.trackingNumber,
        status: complaint.status,
        createdAt: complaint.createdAt
      };

      // Send to admins and department admins
      io.to('role_admin').to('role_departmentAdmin').emit('new_complaint', notificationData);
    } catch (error) {
      console.error('Error sending complaint notification:', error);
    }
  };

  // Export helper functions for use in controllers
  return {
    sendNoticeNotification,
    sendComplaintNotification,
    getOnlineUsers: () => Array.from(onlineUsers.values()),
    isUserOnline: (userId) => onlineUsers.has(userId.toString())
  };
};

module.exports = chatSocketHandler; 