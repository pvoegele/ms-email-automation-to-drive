import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Import routes
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/emails.js';
import onedriveRoutes from './routes/onedrive.js';
import rulesRoutes from './routes/rules.js';
import connectRoutes from './routes/connect.js';
import tenantRoutes from './routes/tenants.js';

// Import services
import { initializeFirebase } from './services/firebase.js';
import { initializeSecretManager } from './services/secretManager.js';
import { startPolling } from './services/pollingService.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

// Async initialization function
async function startServer() {
  // Initialize Express app
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Initialize Firebase
  try {
    initializeFirebase();
    logger.info('Firebase initialized');
  } catch (error) {
    logger.error('Failed to initialize Firebase', { error: error.message });
    process.exit(1);
  }

  // Initialize Secret Manager
  try {
    await initializeSecretManager();
    logger.info('Secret Manager initialized');
  } catch (error) {
    logger.error('Failed to initialize Secret Manager', { error: error.message });
    process.exit(1);
  }

  // Middleware
  app.use(helmet()); // Security headers
  app.use(morgan('dev')); // Request logging

  // CORS configuration
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '50mb' })); // Parse JSON bodies
  app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/onedrive', onedriveRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/connect', connectRoutes);
app.use('/api/tenants', tenantRoutes);

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Email to OneDrive Automation API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        signin: 'GET /api/auth/signin?userId={userId}',
        callback: 'GET /api/auth/callback',
        status: 'GET /api/auth/status/:userId',
        signout: 'POST /api/auth/signout/:userId',
      },
      emails: {
        list: 'GET /api/emails/:userId',
        get: 'GET /api/emails/:userId/:messageId',
        attachments: 'GET /api/emails/:userId/:messageId/attachments',
      },
      onedrive: {
        folders: 'GET /api/onedrive/:userId/folders',
        createFolder: 'POST /api/onedrive/:userId/folders',
        upload: 'POST /api/onedrive/:userId/upload',
      },
      rules: {
        list: 'GET /api/rules/:userId',
        get: 'GET /api/rules/:userId/:ruleId',
        create: 'POST /api/rules/:userId',
        update: 'PUT /api/rules/:userId/:ruleId',
        delete: 'DELETE /api/rules/:userId/:ruleId',
        execute: 'POST /api/rules/:userId/:ruleId/execute',
        logs: 'GET /api/rules/:userId/logs',
      },
    },
  });
});

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  // Start server
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health\n`);
    
    // Start mailbox polling service
    const pollingEnabled = process.env.POLLING_ENABLED !== 'false';
    const pollingInterval = parseInt(process.env.POLLING_INTERVAL_MINUTES || '5', 10);
    
    if (pollingEnabled) {
      startPolling(pollingInterval);
      logger.info(`Mailbox polling started with ${pollingInterval} minute interval`);
    } else {
      logger.info('Mailbox polling disabled');
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });

  return app;
}

// Start the server
const appInstance = await startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Export both for backward compatibility
export default appInstance;
export { startServer };
