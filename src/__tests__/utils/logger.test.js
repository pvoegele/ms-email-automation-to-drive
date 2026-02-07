/**
 * Logger utility tests
 */
import { logger } from '../../utils/logger.js';

describe('Logger Utility', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test('logger.error should log error messages', () => {
    logger.error('Test error');
    expect(consoleErrorSpy).toHaveBeenCalled();
    const logOutput = consoleErrorSpy.mock.calls[0][0];
    expect(logOutput).toContain('ERROR');
    expect(logOutput).toContain('Test error');
  });

  test('logger.warn should log warning messages', () => {
    logger.warn('Test warning');
    expect(consoleWarnSpy).toHaveBeenCalled();
    const logOutput = consoleWarnSpy.mock.calls[0][0];
    expect(logOutput).toContain('WARN');
    expect(logOutput).toContain('Test warning');
  });

  test('logger.info should log info messages', () => {
    logger.info('Test info');
    expect(consoleLogSpy).toHaveBeenCalled();
    const logOutput = consoleLogSpy.mock.calls[0][0];
    expect(logOutput).toContain('INFO');
    expect(logOutput).toContain('Test info');
  });

  test('logger should include metadata when provided', () => {
    logger.info('Test with meta', { userId: '123', action: 'test' });
    expect(consoleLogSpy).toHaveBeenCalled();
    const logOutput = consoleLogSpy.mock.calls[0][0];
    expect(logOutput).toContain('Test with meta');
    expect(logOutput).toContain('userId');
    expect(logOutput).toContain('123');
  });

  test('log messages should include timestamp', () => {
    logger.info('Timestamp test');
    const logOutput = consoleLogSpy.mock.calls[0][0];
    // Check for ISO 8601 timestamp format
    expect(logOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
