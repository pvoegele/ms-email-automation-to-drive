/**
 * Secret Manager service tests
 */
import {
  encryptToken,
  decryptToken,
  storeTokenSecurely,
  retrieveTokenSecurely,
} from '../../services/secretManager.js';

describe('Secret Manager Service', () => {
  const mockTokenData = {
    accessToken: 'test-access-token-123',
    refreshToken: 'test-refresh-token-456',
    expiresOn: new Date('2026-02-09T12:00:00Z'),
  };

  describe('encryptToken', () => {
    test('should encrypt token data', () => {
      const encrypted = encryptToken(mockTokenData);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).toMatch(/^secret:\/\//);
    });

    test('should generate unique encrypted values for same data', () => {
      const encrypted1 = encryptToken(mockTokenData);
      const encrypted2 = encryptToken(mockTokenData);
      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decryptToken', () => {
    test('should decrypt encrypted token data', () => {
      const encrypted = encryptToken(mockTokenData);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBeDefined();
      expect(decrypted.accessToken).toBe(mockTokenData.accessToken);
      expect(decrypted.refreshToken).toBe(mockTokenData.refreshToken);
    });

    test('should throw error for invalid token reference', () => {
      expect(() => decryptToken('invalid-reference')).toThrow('Invalid token reference format');
    });

    test('should throw error for malformed encrypted data', () => {
      expect(() => decryptToken('secret://invalid-base64')).toThrow();
    });
  });

  describe('storeTokenSecurely', () => {
    test('should store tokens and return reference', async () => {
      const userId = 'test-user-123';
      const tokenRef = await storeTokenSecurely(userId, mockTokenData);
      
      expect(tokenRef).toBeDefined();
      expect(typeof tokenRef).toBe('string');
      expect(tokenRef).toMatch(/^secret:\/\//);
    });

    test('should include userId in encrypted data', async () => {
      const userId = 'test-user-456';
      const tokenRef = await storeTokenSecurely(userId, mockTokenData);
      const decrypted = decryptToken(tokenRef);
      
      expect(decrypted.userId).toBe(userId);
    });

    test('should include storedAt timestamp', async () => {
      const userId = 'test-user-789';
      const tokenRef = await storeTokenSecurely(userId, mockTokenData);
      const decrypted = decryptToken(tokenRef);
      
      expect(decrypted).toHaveProperty('storedAt');
      expect(typeof decrypted.storedAt).toBe('string');
    });
  });

  describe('retrieveTokenSecurely', () => {
    test('should retrieve stored tokens', async () => {
      const userId = 'test-user-retrieve';
      const tokenRef = await storeTokenSecurely(userId, mockTokenData);
      const retrieved = await retrieveTokenSecurely(tokenRef);
      
      expect(retrieved).toBeDefined();
      expect(retrieved.accessToken).toBe(mockTokenData.accessToken);
      expect(retrieved.refreshToken).toBe(mockTokenData.refreshToken);
      // expiresOn is stored as Date but returned as ISO string, so compare appropriately
      expect(new Date(retrieved.expiresOn)).toEqual(mockTokenData.expiresOn);
    });

    test('should handle errors for invalid references', async () => {
      await expect(retrieveTokenSecurely('invalid-ref')).rejects.toThrow();
    });
  });

  describe('encryption/decryption round-trip', () => {
    test('should successfully encrypt and decrypt complex token data', () => {
      const complexData = {
        accessToken: 'very-long-access-token-'.repeat(10),
        refreshToken: 'very-long-refresh-token-'.repeat(10),
        expiresOn: new Date('2026-12-31T23:59:59Z'),
        scopes: ['Mail.Read', 'Files.ReadWrite.All', 'User.Read'],
        tenantId: 'test-tenant-id-123',
      };

      const encrypted = encryptToken(complexData);
      const decrypted = decryptToken(encrypted);

      expect(decrypted.accessToken).toBe(complexData.accessToken);
      expect(decrypted.refreshToken).toBe(complexData.refreshToken);
      expect(decrypted.scopes).toEqual(complexData.scopes);
      expect(decrypted.tenantId).toBe(complexData.tenantId);
    });
  });
});
