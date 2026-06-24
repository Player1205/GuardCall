import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { setupCallSocket } from './sockets/callSocket.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import reportRoutes from './routes/reports.js';
import communityRoutes from './routes/community.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/community', communityRoutes);

// Error Handler
app.use(errorHandler);

// Socket.IO
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  setupCallSocket(socket, io);
});

const PORT = process.env.PORT || 3001;

// Connect to DB and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to database', err);
});
