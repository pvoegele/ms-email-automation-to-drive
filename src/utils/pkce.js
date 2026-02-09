import crypto from 'crypto';

/**
 * PKCE Utilities
 * Implements PKCE (Proof Key for Code Exchange) for OAuth security
 */

/**
 * Generate PKCE code verifier
 * @returns {string} Code verifier (base64url encoded random string)
 */
export function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

/**
 * Generate PKCE code challenge from verifier
 * @param {string} verifier - Code verifier
 * @returns {string} Code challenge (base64url encoded SHA256 hash)
 */
export function generateCodeChallenge(verifier) {
  return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
}

/**
 * Base64 URL encode
 * @param {Buffer} buffer - Buffer to encode
 * @returns {string} Base64 URL encoded string
 */
function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate PKCE pair (verifier and challenge)
 * @returns {object} Object with verifier and challenge
 */
export function generatePKCEPair() {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  
  return {
    verifier,
    challenge,
  };
}

/**
 * Generate state parameter for CSRF protection
 * @param {object} data - Data to encode in state
 * @returns {string} State parameter
 */
export function generateState(data = {}) {
  const stateData = {
    ...data,
    nonce: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now(),
  };
  
  return Buffer.from(JSON.stringify(stateData)).toString('base64url');
}

/**
 * Parse state parameter
 * @param {string} state - State parameter
 * @returns {object} Parsed state data
 */
export function parseState(state) {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
  } catch (error) {
    throw new Error('Invalid state parameter');
  }
}

/**
 * Validate state parameter
 * @param {string} state - State parameter to validate
 * @param {number} maxAge - Maximum age in milliseconds (default: 10 minutes)
 * @returns {object} Parsed and validated state data
 */
export function validateState(state, maxAge = 10 * 60 * 1000) {
  const stateData = parseState(state);
  
  // Check timestamp
  const age = Date.now() - stateData.timestamp;
  if (age > maxAge) {
    throw new Error('State parameter expired');
  }
  
  return stateData;
}
