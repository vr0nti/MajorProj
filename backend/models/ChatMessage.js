const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  chatRoom: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat', 
    required: true 
  },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'file', 'emoji'], 
    default: 'text' 
  },
  content: { 
    type: String, 
    required: true 
  },
  fileUrl: { 
    type: String 
  },
  fileName: { 
    type: String 
  },
  fileSize: { 
    type: Number 
  },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'], 
    default: 'sent' 
  },
  readAt: { 
    type: Date 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  deletedAt: { 
    type: Date 
  },
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

// Index for efficient querying
chatMessageSchema.index({ chatRoom: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema); 