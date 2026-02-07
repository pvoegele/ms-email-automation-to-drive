import { getUserTokens } from '../services/firebase.js';

/**
 * Authentication middleware to verify user tokens
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
export async function authenticateUser(req, res, next) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user tokens from Firestore
    const tokens = await getUserTokens(userId);

    if (!tokens) {
      return res.status(401).json({ 
        error: 'User not authenticated. Please sign in first.',
        authenticated: false 
      });
    }

    // Check if token has expired
    const now = new Date().getTime();
    const expiresOn = new Date(tokens.expiresOn).getTime();

    if (now >= expiresOn) {
      return res.status(401).json({ 
        error: 'Access token expired. Please re-authenticate.',
        authenticated: false 
      });
    }

    // Attach tokens to request for use in routes
    req.userTokens = tokens;
    req.userId = userId;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
}

/**
 * Optional authentication middleware (doesn't fail if not authenticated)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
export async function optionalAuth(req, res, next) {
  try {
    const { userId } = req.params;

    if (userId) {
      const tokens = await getUserTokens(userId);
      if (tokens) {
        req.userTokens = tokens;
        req.userId = userId;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}
