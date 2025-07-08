const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const path = require('path');
const mainRouter = require('./routes');
const chatSocketHandler = require('./sockets/chat');
const User = require('./models/User');
const bcrypt = require('bcrypt');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketio(server, { cors: { origin: '*' } });

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await User.seedAdmin();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// ROUTES
app.get('/', (req, res) => res.send('College ERP API running'));
app.use('/api', mainRouter);

chatSocketHandler(io);

const PORT = process.env.PORT || 5000;

// Only start server if not in test environment

  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


module.exports = app; 