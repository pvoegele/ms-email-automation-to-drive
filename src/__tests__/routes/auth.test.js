/**
 * Authentication routes integration tests
 */
import { jest } from '@jest/globals';

// Set up env vars before imports
process.env.CLIENT_ID = 'test-client-id';
process.env.CLIENT_SECRET = 'test-client-secret';
process.env.TENANT_ID = 'common';
process.env.REDIRECT_URI = 'http://localhost:3000/api/auth/callback';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Mock the MSAL module before importing anything else
jest.unstable_mockModule('@azure/msal-node', () => ({
  default: {},
  ConfidentialClientApplication: class MockConfidentialClientApplication {
    constructor() {}
    async getAuthCodeUrl() {
      return 'https://login.microsoftonline.com/mock-auth-url';
    }
    async acquireTokenByCode() {
      return {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresOn: new Date(Date.now() + 3600000),
      };
    }
    async acquireTokenByRefreshToken() {
      return {
        accessToken: 'mock_new_access_token',
        refreshToken: 'mock_refresh_token',
        expiresOn: new Date(Date.now() + 3600000),
      };
    }
  },
  LogLevel: { Warning: 3 },
}));

// Mock Firebase
jest.unstable_mockModule('../../services/firebase.js', () => ({
  storeUserTokens: jest.fn().mockResolvedValue(undefined),
  getUserTokens: jest.fn().mockImplementation((userId) => {
    if (userId === 'authenticated_user') {
      return Promise.resolve({
        accessToken: 'mock_token',
        refreshToken: 'mock_refresh',
        expiresOn: new Date(Date.now() + 3600000),
      });
    }
    return Promise.resolve(null);
  }),
  deleteUserTokens: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import express from 'express';

describe('Authentication Routes', () => {
  let app;
  let authRoutes;

  beforeAll(async () => {
    authRoutes = (await import('../../routes/auth.js')).default;
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  describe('GET /api/auth/signin', () => {
    test('should return auth URL when userId is provided', async () => {
      const response = await request(app)
        .get('/api/auth/signin')
        .query({ userId: 'testuser' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authUrl');
      expect(response.body.authUrl).toContain('login.microsoftonline.com');
      expect(response.body).toHaveProperty('message');
    });

    test('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .get('/api/auth/signin');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('userId');
    });
  });

  describe('GET /api/auth/status/:userId', () => {
    test('should return authenticated status for valid user', async () => {
      const response = await request(app)
        .get('/api/auth/status/authenticated_user');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authenticated');
      expect(response.body.authenticated).toBe(true);
    });

    test('should return not authenticated for non-existent user', async () => {
      const response = await request(app)
        .get('/api/auth/status/nonexistent_user');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authenticated');
      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('POST /api/auth/signout/:userId', () => {
    test('should successfully sign out user', async () => {
      const response = await request(app)
        .post('/api/auth/signout/testuser');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
    });
  });
});
