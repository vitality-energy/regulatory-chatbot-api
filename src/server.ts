import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createServer } from 'http';
import { chatRoutes } from './routes';
import authRoutes from './routes/authRoutes';
import { logger } from './utils/logger';
import { apiCallLogger } from './middleware/apiCallLogger';
import { WebSocketService } from './services';
import { AuthService } from './services/authService';

const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT) || 3001;

// Security middleware - updated for single-server frontend serving
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Vite in production
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
      fontSrc: ["'self'", "data:"],
    },
  },
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      logger.info(logLine);
    }
  });

  next();
});


// CORS configuration - simplified for single-server setup
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  validate: {
    xForwardedForHeader: false,
  },
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global API call logging middleware
app.use(apiCallLogger);

// Health check endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const { pool } = await import('./db/config');
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (error) {
    logger.error('Healthcheck: Database connection failed', error);
    dbStatus = 'disconnected';
  }

  const healthData = {
    status: dbStatus === 'connected' ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };

  res.status(healthData.status === 'OK' ? 200 : 503).json(healthData);
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);

// Serve static files from frontend build
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Catch-all handler: serve frontend index.html for non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  return res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Initialize WebSocket service
let webSocketService: WebSocketService;

// Initialize database and start server
async function startServer() {
  try {
    // Start server
    server.listen(PORT,'0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      
      // Initialize WebSocket service after server starts
      webSocketService = new WebSocketService(server);
      
      // Connect AuthService with WebSocket service for session management
      AuthService.setWebSocketService(webSocketService);
      
      logger.info('WebSocket service initialized and connected to AuthService');
    });
    
    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('Shutting down gracefully...');
      if (webSocketService) {
        webSocketService.close();
      }
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
export { webSocketService }; 