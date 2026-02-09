import * as msal from '@azure/msal-node';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Microsoft Authentication Library (MSAL) Configuration
 * Supports multi-tenant authentication
 */

// Validate required environment variables
function validateMsalConfig() {
  const missing = [];
  if (!process.env.CLIENT_ID) missing.push('CLIENT_ID');
  if (!process.env.CLIENT_SECRET) missing.push('CLIENT_SECRET');
  if (!process.env.REDIRECT_URI) missing.push('REDIRECT_URI');
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required Azure AD environment variables: ${missing.join(', ')}\n` +
      `Please create a .env file with the required credentials.\n` +
      `See SETUP.md or README.md for configuration instructions.`
    );
  }
}

// Validate configuration before creating client
validateMsalConfig();

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
 * Exchange authorization code for tokens
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
