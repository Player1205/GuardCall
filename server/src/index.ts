import express, { Express } from 'express';
import http from 'http';
import dns from 'dns';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

// Fix for Node.js >17 undici fetch ENOTFOUND issues with IPv6
dns.setDefaultResultOrder('ipv4first');
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { setupCallSocket } from './sockets/callSocket.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import reportRoutes from './routes/reports.js';
import communityRoutes from './routes/community.js';
import deepgramRoutes from './routes/deepgram.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

dotenv.config();

export const app: Express = express();
const server = http.createServer(app);

// Allowed origins: deployed PWA + Capacitor native app origins
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/deepgram', deepgramRoutes);

// Error Handler
app.use(errorHandler);

// Socket.IO
io.on('connection', (socket: Socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  setupCallSocket(socket, io);
});

const PORT = process.env.PORT || 3001;

// Connect to DB and start server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  }).catch((err: any) => {
    logger.error('Failed to connect to database', { error: err.message });
  });
}
