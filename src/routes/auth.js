import express from 'express';
import { getAuthUrl, getTokenFromCode } from '../auth/msalConfig.js';
import { storeUserTokens, getUserTokens } from '../services/firebase.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/signin:
 *   get:
 *     summary: Get Microsoft authentication URL
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *     responses:
 *       200:
 *         description: Authentication URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthUrl'
 *       400:
 *         description: Missing userId parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/auth/callback:
 *   get:
 *     summary: Handle OAuth callback from Microsoft
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Microsoft
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter containing userId
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error code from OAuth provider
 *       - in: query
 *         name: error_description
 *         schema:
 *           type: string
 *         description: Error description from OAuth provider
 *     responses:
 *       302:
 *         description: Redirects to frontend with success or error status
 *       400:
 *         description: Missing code or state parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/auth/status/{userId}:
 *   get:
 *     summary: Check authentication status for a user
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *     responses:
 *       200:
 *         description: Authentication status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthStatus'
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
 * @swagger
 * /api/auth/signout/{userId}:
 *   post:
 *     summary: Sign out user and remove tokens
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *     responses:
 *       200:
 *         description: User signed out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
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
