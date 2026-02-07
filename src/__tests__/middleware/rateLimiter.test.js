/**
 * Rate Limiter middleware tests
 */
import { apiLimiter, authLimiter, uploadLimiter } from '../../middleware/rateLimiter.js';

describe('Rate Limiter Middleware', () => {
  test('apiLimiter should be defined', () => {
    expect(apiLimiter).toBeDefined();
    expect(typeof apiLimiter).toBe('function');
  });

  test('authLimiter should be defined', () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  test('uploadLimiter should be defined', () => {
    expect(uploadLimiter).toBeDefined();
    expect(typeof uploadLimiter).toBe('function');
  });

  test('rate limiters should be middleware functions', () => {
    // Rate limiters are functions that can be used as middleware
    expect(apiLimiter.length).toBeGreaterThan(0);
    expect(authLimiter.length).toBeGreaterThan(0);
    expect(uploadLimiter.length).toBeGreaterThan(0);
  });
});
