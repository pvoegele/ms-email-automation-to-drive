import express from 'express';
import { getAuthUrl, getTokenFromCode } from '../auth/msalConfig.js';
import { storeUserTokens, getUserTokens } from '../services/firebase.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * GET /api/auth/signin
 * Get Microsoft authentication URL
 */
router.get('/signin', authLimiter, async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const authUrl = await getAuthUrl(userId);

    res.json({
      authUrl,
      message: 'Please navigate to this URL to sign in',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/callback
 * Handle OAuth callback from Microsoft
 */
router.get('/callback', authLimiter, async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle error from OAuth provider
    if (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/auth/error?error=${error}&description=${error_description}`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    const userId = state; // State contains userId

    // Exchange code for tokens
    const tokenResponse = await getTokenFromCode(code);

    // Store tokens in Firestore
    await storeUserTokens(userId, {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresOn: tokenResponse.expiresOn,
    });

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/success?userId=${userId}`);
  } catch (error) {
    console.error('Auth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error?error=token_exchange_failed`);
  }
});

/**
 * GET /api/auth/status/:userId
 * Check authentication status for a user
 */
router.get('/status/:userId', authLimiter, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const tokens = await getUserTokens(userId);

    if (!tokens) {
      return res.json({
        authenticated: false,
        message: 'User not authenticated',
      });
    }

    // Check if token is expired
    const now = new Date().getTime();
    const expiresOn = new Date(tokens.expiresOn).getTime();
    const isExpired = now >= expiresOn;

    res.json({
      authenticated: !isExpired,
      expiresOn: tokens.expiresOn,
      expired: isExpired,
      message: isExpired ? 'Token expired, please re-authenticate' : 'User authenticated',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/signout/:userId
 * Sign out user and remove tokens
 */
router.post('/signout/:userId', authLimiter, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const { deleteUserTokens } = await import('../services/firebase.js');
    await deleteUserTokens(userId);

    res.json({
      success: true,
      message: 'User signed out successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
