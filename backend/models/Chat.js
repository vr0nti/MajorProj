const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatType: { 
    type: String, 
    enum: ['one-on-one', 'group'], 
    default: 'one-on-one' 
  },
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  groupName: { 
    type: String 
  },
  groupDescription: { 
    type: String 
  },
  groupAdmin: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastMessage: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ChatMessage' 
  },
  lastMessageAt: { 
    type: Date 
  },
  unreadCount: { 
    type: Map, 
    of: Number, 
    default: new Map() 
  },
  mutedBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mutedAt: { type: Date, default: Date.now }
  }],
  blockedUsers: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockedAt: { type: Date, default: Date.now }
  }],
  monitoredBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }, // admin
  encryptionKey: { 
    type: String 
  },
  retentionPolicy: { 
    type: String, 
    enum: ['7days', '30days', '90days', '1year', 'permanent'], 
    default: '90days' 
  }
}, { timestamps: true });

// Index for efficient querying
chatSchema.index({ participants: 1 });
chatSchema.index({ chatType: 1, isActive: 1 });
chatSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Chat', chatSchema); 