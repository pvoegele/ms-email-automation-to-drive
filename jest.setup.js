// Jest setup file
import { jest } from '@jest/globals';

// Make jest available globally
global.jest = jest;

// Set required environment variables for tests
process.env.TOKEN_ENCRYPTION_KEY = '6afdca1dea018b41cb5c8657ea191ec7a8d7d4610a79dd1a2d6f55ebe83f17ac';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
process.env.FIREBASE_PRIVATE_KEY = 'test-key';
process.env.CLIENT_ID = 'test-client-id';
process.env.CLIENT_SECRET = 'test-client-secret';
