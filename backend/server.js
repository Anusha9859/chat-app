import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' }); // Adjust if needed

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import colors from 'colors';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import path from 'path';
import cors from 'cors';  // To handle CORS issues if needed

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(cors());  // Use this if you're dealing with CORS issues

// REST API Routes
app.get('/api', (req, res) => {
  res.json({ message: 'API is running successfully' });
});

app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);

//--------------------- Deployment -----------------------------

const __dirname1 = path.resolve();

// Serve React app and API on the same port in production
if (process.env.NODE_ENV === "production") {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname1, 'frontend/build')));

  // Catch-all route to serve the React app for any route that isn't an API route
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname1, 'frontend', 'build', 'index.html'));
  });
} else {
  // In development mode, you can still have API route available
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

//-------------------------------------------------------------

// Error middleware
app.use(notFound);
app.use(errorHandler);

// Create HTTP server and bind socket.io
const server = createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: '*', // Allowing all origins for socket connection
  },
});

io.on('connection', (socket) => {
  console.log('Connected to socket.io');

  socket.on('setup', (userData) => {
    socket.join(userData._id);
    socket.emit('connected');
  });

  socket.on('join chat', (room) => {
    socket.join(room);
    console.log('User Joined Room: ' + room);
  });

  socket.on('typing', (room) => socket.in(room).emit('typing'));
  socket.on('stop typing', (room) => socket.in(room).emit('stop typing'));

  socket.on('new message', (newMessageReceived) => {
    const chat = newMessageReceived.chat;

    if (!chat.users) return console.log('chat.users not defined');

    chat.users.forEach((user) => {
      if (user._id === newMessageReceived.sender._id) return;
      socket.in(user._id).emit('message recieved', newMessageReceived);
    });
  });

  socket.off('setup', (userData) => {
    console.log('USER DISCONNECTED');
    socket.leave(userData._id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Server started on http://localhost:${PORT}`.yellow.bold)
);
