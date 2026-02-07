/**
 * Error Handler middleware tests
 */
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler.js';

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/test/path',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    
    // Suppress console.error in tests
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('errorHandler', () => {
    test('should handle Microsoft Graph API errors', () => {
      const error = {
        statusCode: 401,
        code: 'InvalidAuthenticationToken',
        message: 'Access token has expired',
        body: { error: { message: 'Token expired' } },
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token has expired',
        code: 'InvalidAuthenticationToken',
        details: { error: { message: 'Token expired' } },
      });
    });

    test('should handle Firebase auth errors', () => {
      const error = {
        code: 'auth/invalid-credential',
        message: 'Invalid credentials',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication error',
        details: 'Invalid credentials',
      });
    });

    test('should handle validation errors', () => {
      const error = {
        name: 'ValidationError',
        message: 'Invalid input',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: 'Invalid input',
      });
    });

    test('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.error).toBe('Something went wrong');
    });

    test('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Dev error');

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response).toHaveProperty('stack');
    });
  });

  describe('notFoundHandler', () => {
    test('should return 404 for unknown routes', () => {
      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Route not found',
        path: '/test/path',
      });
    });
  });
});
