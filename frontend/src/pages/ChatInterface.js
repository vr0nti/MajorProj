import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import  useAuth  from '../hooks/useAuth';
import '../styles/chat-interface.css';

const ChatInterface = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchChats();
    fetchUsers();
    // TODO: Initialize Socket.io connection here
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      const response = await axios.get('/chat/user-chats');
      setChats(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch chats');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/user/all');
      setUsers(response.data.filter(u => u._id !== user._id));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await axios.get(`/chat/messages/${chatId}`);
      setMessages(response.data.messages);
    } catch (err) {
      setError('Failed to fetch messages');
    }
  };

  const createNewChat = async (participantId) => {
    try {
      const response = await axios.post('/chat/create', {
        participantId,
        chatType: 'one-on-one'
      });
      setChats([response.data.chat, ...chats]);
      setSelectedChat(response.data.chat);
      setShowNewChat(false);
    } catch (err) {
      setError('Failed to create chat');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const response = await axios.post('/chat/send-message', {
        chatId: selectedChat._id,
        content: newMessage,
        messageType: 'text'
      });
      
      // Add message to local state
      setMessages([...messages, response.data.message]);
      setNewMessage('');
      
      // Update chat's last message
      const updatedChats = chats.map(chat => 
        chat._id === selectedChat._id 
          ? { ...chat, lastMessage: response.data.message, lastMessageAt: new Date() }
          : chat
      );
      setChats(updatedChats);
    } catch (err) {
      setError('Failed to send message');
    }
  };

  const sendFile = async (file) => {
    if (!selectedChat) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', selectedChat._id);
      formData.append('messageType', 'file');

      const response = await axios.post('/chat/send-message', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessages([...messages, response.data.message]);
      
      const updatedChats = chats.map(chat => 
        chat._id === selectedChat._id 
          ? { ...chat, lastMessage: response.data.message, lastMessageAt: new Date() }
          : chat
      );
      setChats(updatedChats);
    } catch (err) {
      setError('Failed to send file');
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await axios.delete(`/chat/message/${messageId}`);
      setMessages(messages.filter(msg => msg._id !== messageId));
    } catch (err) {
      setError('Failed to delete message');
    }
  };

  const toggleMuteChat = async (chatId) => {
    try {
      await axios.put(`/chat/mute/${chatId}`);
      const updatedChats = chats.map(chat => 
        chat._id === chatId 
          ? { ...chat, isMuted: !chat.isMuted }
          : chat
      );
      setChats(updatedChats);
    } catch (err) {
      setError('Failed to toggle mute');
    }
  };

  const blockUser = async (chatId, userId) => {
    try {
      await axios.put(`/chat/block/${chatId}/${userId}`);
      // Refresh chats to reflect changes
      fetchChats();
    } catch (err) {
      setError('Failed to block user');
    }
  };

  const searchMessages = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await axios.get(`/chat/search?query=${searchQuery}&chatId=${selectedChat?._id || ''}`);
      // Handle search results
      console.log('Search results:', response.data);
    } catch (err) {
      setError('Failed to search messages');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === new Date(today.getTime() - 24*60*60*1000).toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const getChatName = (chat) => {
    if (chat.chatType === 'group') {
      return chat.groupName;
    }
    
    const otherParticipant = chat.participants.find(p => p._id !== user._id);
    return otherParticipant?.name || 'Unknown User';
  };

  const getChatAvatar = (chat) => {
    if (chat.chatType === 'group') {
      return '👥';
    }
    
    const otherParticipant = chat.participants.find(p => p._id !== user._id);
    return otherParticipant?.name?.charAt(0).toUpperCase() || '?';
  };

  const isOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  return (
    <div className="chat-interface-container">
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>Chats</h2>
          <button 
            className="btn btn-primary btn-small"
            onClick={() => setShowNewChat(!showNewChat)}
          >
            {showNewChat ? 'Cancel' : 'New Chat'}
          </button>
        </div>

        {showNewChat && (
          <div className="new-chat-section">
            <h3>Start New Chat</h3>
            <div className="users-list">
              {users.map(usr => (
                <div 
                  key={usr._id} 
                  className="user-item"
                  onClick={() => createNewChat(usr._id)}
                >
                  <div className="user-avatar">
                    {usr.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{usr.name}</div>
                    <div className="user-role">{usr.role}</div>
                  </div>
                  <div className={`online-indicator ${isOnline(usr._id) ? 'online' : 'offline'}`}></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="chats-list">
          {chats.map(chat => (
            <div 
              key={chat._id}
              className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
              onClick={() => setSelectedChat(chat)}
            >
              <div className="chat-avatar">
                {getChatAvatar(chat)}
              </div>
              <div className="chat-info">
                <div className="chat-name">{getChatName(chat)}</div>
                <div className="chat-last-message">
                  {chat.lastMessage?.content || 'No messages yet'}
                </div>
                <div className="chat-time">
                  {chat.lastMessageAt ? formatTime(chat.lastMessageAt) : ''}
                </div>
              </div>
              <div className="chat-actions">
                {chat.unreadCount > 0 && (
                  <span className="unread-badge">{chat.unreadCount}</span>
                )}
                <button 
                  className="btn btn-small btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMuteChat(chat._id);
                  }}
                >
                  {chat.isMuted ? '🔇' : '🔊'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-avatar">
                  {getChatAvatar(selectedChat)}
                </div>
                <div className="chat-details">
                  <h3>{getChatName(selectedChat)}</h3>
                  <span className={`online-status ${isOnline(selectedChat.participants.find(p => p._id !== user._id)?._id) ? 'online' : 'offline'}`}>
                    {isOnline(selectedChat.participants.find(p => p._id !== user._id)?._id) ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="chat-header-actions">
                <button 
                  className="btn btn-small btn-secondary"
                  onClick={() => setSearchQuery('')}
                >
                  🔍
                </button>
                <button 
                  className="btn btn-small btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📎
                </button>
                <button 
                  className="btn btn-small btn-danger"
                  onClick={() => blockUser(selectedChat._id, selectedChat.participants.find(p => p._id !== user._id)?._id)}
                >
                  🚫
                </button>
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((message, index) => (
                <div 
                  key={message._id}
                  className={`message ${message.sender._id === user._id ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    {message.messageType === 'file' ? (
                      <div className="file-message">
                        <div className="file-icon">📎</div>
                        <div className="file-info">
                          <div className="file-name">{message.fileName}</div>
                          <div className="file-size">{(message.fileSize / 1024).toFixed(1)} KB</div>
                        </div>
                        <a 
                          href={message.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="download-link"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                    <div className="message-meta">
                      <span className="message-time">{formatTime(message.createdAt)}</span>
                      {message.sender._id === user._id && (
                        <button 
                          className="delete-message"
                          onClick={() => deleteMessage(message._id)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="chat-input-form">
              <div className="chat-input-container">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="chat-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                />
                <button type="submit" className="send-button" disabled={!newMessage.trim()}>
                  ➤
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-content">
              <h2>Welcome to Chat</h2>
              <p>Select a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files[0]) {
            sendFile(e.target.files[0]);
          }
        }}
      />

      {/* {error && <div className="error-message">{error}</div>} */}
    </div>
  );
};

export default ChatInterface; 