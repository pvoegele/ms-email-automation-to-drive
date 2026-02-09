/**
 * PKCE utilities tests
 */
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  generateState,
  parseState,
  validateState,
} from '../../utils/pkce.js';

describe('PKCE Utilities', () => {
  describe('generateCodeVerifier', () => {
    test('should generate a code verifier', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe('string');
      expect(verifier.length).toBeGreaterThan(0);
    });

    test('should generate unique verifiers', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    test('should generate base64url encoded string', () => {
      const verifier = generateCodeVerifier();
      // Base64url should not contain +, /, or =
      expect(verifier).not.toMatch(/[+/=]/);
    });
  });

  describe('generateCodeChallenge', () => {
    test('should generate a code challenge from verifier', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
    });

    test('should generate consistent challenge for same verifier', () => {
      const verifier = 'test-verifier-123';
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    test('should generate base64url encoded string', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      // Base64url should not contain +, /, or =
      expect(challenge).not.toMatch(/[+/=]/);
    });
  });

  describe('generatePKCEPair', () => {
    test('should generate verifier and challenge pair', () => {
      const pair = generatePKCEPair();
      expect(pair).toHaveProperty('verifier');
      expect(pair).toHaveProperty('challenge');
      expect(typeof pair.verifier).toBe('string');
      expect(typeof pair.challenge).toBe('string');
    });

    test('should generate unique pairs', () => {
      const pair1 = generatePKCEPair();
      const pair2 = generatePKCEPair();
      expect(pair1.verifier).not.toBe(pair2.verifier);
      expect(pair1.challenge).not.toBe(pair2.challenge);
    });
  });

  describe('generateState', () => {
    test('should generate a state parameter', () => {
      const state = generateState();
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    test('should include provided data in state', () => {
      const data = { tenantId: 'test123', connectionId: 'conn456' };
      const state = generateState(data);
      const parsed = parseState(state);
      expect(parsed.tenantId).toBe('test123');
      expect(parsed.connectionId).toBe('conn456');
    });

    test('should include nonce in state', () => {
      const state = generateState();
      const parsed = parseState(state);
      expect(parsed).toHaveProperty('nonce');
      expect(typeof parsed.nonce).toBe('string');
    });

    test('should include timestamp in state', () => {
      const state = generateState();
      const parsed = parseState(state);
      expect(parsed).toHaveProperty('timestamp');
      expect(typeof parsed.timestamp).toBe('number');
    });
  });

  describe('parseState', () => {
    test('should parse state parameter correctly', () => {
      const data = { tenantId: 'test123' };
      const state = generateState(data);
      const parsed = parseState(state);
      expect(parsed.tenantId).toBe('test123');
      expect(parsed).toHaveProperty('nonce');
      expect(parsed).toHaveProperty('timestamp');
    });

    test('should throw error for invalid state', () => {
      expect(() => parseState('invalid-state')).toThrow('Invalid state parameter');
    });
  });

  describe('validateState', () => {
    test('should validate valid state', () => {
      const data = { tenantId: 'test123' };
      const state = generateState(data);
      const validated = validateState(state);
      expect(validated.tenantId).toBe('test123');
    });

    test('should throw error for expired state', () => {
      // Create a state with old timestamp
      const oldTimestamp = Date.now() - 20 * 60 * 1000; // 20 minutes ago
      const stateData = {
        tenantId: 'test123',
        nonce: 'test-nonce',
        timestamp: oldTimestamp,
      };
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');
      
      expect(() => validateState(state, 10 * 60 * 1000)).toThrow('State parameter expired');
    });

    test('should accept state within maxAge', () => {
      const state = generateState({ tenantId: 'test123' });
      const validated = validateState(state, 10 * 60 * 1000);
      expect(validated.tenantId).toBe('test123');
    });
  });
});
