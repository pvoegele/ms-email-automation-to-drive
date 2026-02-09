import * as msal from '@azure/msal-node';
import dotenv from 'dotenv';
import { generatePKCEPair, generateState } from '../utils/pkce.js';

dotenv.config();

/**
 * Microsoft Authentication Library (MSAL) Configuration
 * Supports multi-tenant authentication
 */
const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID || 'common'}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (!containsPii) {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Warning,
    },
  },
};

/**
 * Required Microsoft Graph API scopes
 */
export const SCOPES = [
  'User.Read',
  'Mail.Read',
  'Mail.ReadWrite',
  'Files.ReadWrite.All',
  'offline_access',
];

/**
 * Create MSAL Confidential Client Application
 */
export const msalClient = new msal.ConfidentialClientApplication(msalConfig);

/**
 * Generate authorization URL with PKCE
 * @param {string} tenantId - Tenant identifier
 * @param {string} connectionId - Connection identifier
 * @returns {Promise<object>} Object with authUrl, state, and verifier
 */
export async function getAuthUrlWithPKCE(tenantId, connectionId) {
  try {
    // Generate PKCE pair
    const { verifier, challenge } = generatePKCEPair();
    
    // Generate state with tenant and connection info
    const state = generateState({ tenantId, connectionId });
    
    const authCodeUrlParameters = {
      scopes: SCOPES,
      redirectUri: process.env.REDIRECT_URI,
      state: state,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
    };

    const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    
    return {
      authUrl,
      state,
      verifier, // Must be stored temporarily for validation in callback
    };
  } catch (error) {
    console.error('Error generating auth URL with PKCE:', error);
    throw error;
  }
}

/**
 * Generate authorization URL with PKCE (legacy support)
 * @param {string} userId - User identifier
 * @returns {Promise<string>} Authorization URL
 */
export async function getAuthUrl(userId) {
  const authCodeUrlParameters = {
    scopes: SCOPES,
    redirectUri: process.env.REDIRECT_URI,
    state: userId, // Pass userId as state for callback
  };

  try {
    const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    return authUrl;
  } catch (error) {
    console.error('Error generating auth URL:', error);
    throw error;
  }
}

/**
 * Exchange authorization code for tokens with PKCE
 * @param {string} code - Authorization code from callback
 * @param {string} codeVerifier - PKCE code verifier
 * @returns {Promise<object>} Token response
 */
export async function getTokenFromCodeWithPKCE(code, codeVerifier) {
  const tokenRequest = {
    code,
    scopes: SCOPES,
    redirectUri: process.env.REDIRECT_URI,
    codeVerifier: codeVerifier,
  };

  try {
    const response = await msalClient.acquireTokenByCode(tokenRequest);
    return response;
  } catch (error) {
    console.error('Error acquiring token with PKCE:', error);
    throw error;
  }
}

/**
 * Exchange authorization code for tokens (legacy support)
 * @param {string} code - Authorization code from callback
 * @returns {Promise<object>} Token response
 */
export async function getTokenFromCode(code) {
  const tokenRequest = {
    code,
    scopes: SCOPES,
    redirectUri: process.env.REDIRECT_URI,
  };

  try {
    const response = await msalClient.acquireTokenByCode(tokenRequest);
    return response;
  } catch (error) {
    console.error('Error acquiring token:', error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<object>} New token response
 */
export async function refreshAccessToken(refreshToken) {
  const refreshRequest = {
    refreshToken,
    scopes: SCOPES,
  };

  try {
    const response = await msalClient.acquireTokenByRefreshToken(refreshRequest);
    return response;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}
