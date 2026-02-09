import crypto from 'crypto';

/**
 * Secret Manager Service
 * Handles secure storage and retrieval of tokens
 * 
 * MVP Implementation: Uses in-memory encryption with environment key
 * Production: Should integrate with Google Secret Manager or similar
 */

// Encryption key must be set in environment variables
// This is critical for production as keys are needed to decrypt stored tokens
if (!process.env.TOKEN_ENCRYPTION_KEY) {
  throw new Error('TOKEN_ENCRYPTION_KEY environment variable must be set for token encryption');
}

const ENCRYPTION_KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('TOKEN_ENCRYPTION_KEY must be a 32-byte (64 hex characters) key');
}

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt token data
 * @param {object} tokenData - Token data to encrypt
 * @returns {string} Encrypted token reference
 */
export function encryptToken(tokenData) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    const tokenString = JSON.stringify(tokenData);
    let encrypted = cipher.update(tokenString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Store IV, auth tag, and encrypted data together
    const encryptedData = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted: encrypted,
    };
    
    // Create a reference string
    const reference = Buffer.from(JSON.stringify(encryptedData)).toString('base64');
    return `secret://${reference}`;
  } catch (error) {
    console.error('Error encrypting token:', error);
    throw error;
  }
}

/**
 * Decrypt token data
 * @param {string} tokenRef - Token reference (format: secret://...)
 * @returns {object} Decrypted token data
 */
export function decryptToken(tokenRef) {
  try {
    if (!tokenRef || !tokenRef.startsWith('secret://')) {
      throw new Error('Invalid token reference format');
    }
    
    // Extract the reference
    const reference = tokenRef.substring(9);
    const encryptedData = JSON.parse(Buffer.from(reference, 'base64').toString('utf8'));
    
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const encrypted = encryptedData.encrypted;
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting token:', error);
    throw error;
  }
}

/**
 * Store tokens securely
 * @param {string} userId - User/Connection identifier
 * @param {object} tokens - Token object with accessToken, refreshToken, expiresOn
 * @returns {Promise<string>} Token reference
 */
export async function storeTokenSecurely(userId, tokens) {
  try {
    // In production, this would call Google Secret Manager API
    // For MVP, we encrypt and return a reference
    const tokenRef = encryptToken({
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresOn: tokens.expiresOn,
      storedAt: new Date().toISOString(),
    });
    
    console.log(`Tokens stored securely for user: ${userId}`);
    return tokenRef;
  } catch (error) {
    console.error('Error storing tokens securely:', error);
    throw error;
  }
}

/**
 * Retrieve tokens securely
 * @param {string} tokenRef - Token reference from Secret Manager
 * @returns {Promise<object>} Token object
 */
export async function retrieveTokenSecurely(tokenRef) {
  try {
    // In production, this would call Google Secret Manager API
    // For MVP, we decrypt the reference
    const tokenData = decryptToken(tokenRef);
    
    return {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresOn: tokenData.expiresOn,
    };
  } catch (error) {
    console.error('Error retrieving tokens securely:', error);
    throw error;
  }
}

/**
 * Delete tokens securely
 * @param {string} tokenRef - Token reference from Secret Manager
 * @returns {Promise<void>}
 */
export async function deleteTokenSecurely(tokenRef) {
  try {
    // In production, this would call Google Secret Manager API to delete the secret
    // For MVP, we just log the deletion
    console.log(`Token reference marked for deletion: ${tokenRef}`);
  } catch (error) {
    console.error('Error deleting tokens securely:', error);
    throw error;
  }
}

/**
 * Initialize Secret Manager (for production)
 * In production, this would initialize the Google Secret Manager client
 * @returns {Promise<void>}
 */
export async function initializeSecretManager() {
  try {
    // For MVP, verify encryption key is properly set
    if (!process.env.TOKEN_ENCRYPTION_KEY) {
      throw new Error('TOKEN_ENCRYPTION_KEY not set');
    }
    console.log('Secret Manager initialized with encryption key');
  } catch (error) {
    console.error('Error initializing Secret Manager:', error);
    throw error;
  }
}
