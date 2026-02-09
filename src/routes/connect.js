import express from 'express';
import { getAuthUrlWithPKCE, getTokenFromCodeWithPKCE, SCOPES } from '../auth/msalConfig.js';
import { createTenant, getTenant } from '../services/tenantService.js';
import { createMsConnection, getMsConnection, updateMsConnection } from '../services/msConnectionService.js';
import { storeTokenSecurely } from '../services/secretManager.js';
import { validateState } from '../utils/pkce.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Temporary in-memory store for PKCE verifiers
// In production, use Redis or similar
const pkceStore = new Map();

/**
 * GET /connect/microsoft/start
 * Start Microsoft OAuth flow with PKCE
 * Query params: tenantId
 */
router.get('/microsoft/start', authLimiter, async (req, res, next) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    // Ensure tenant exists or create it
    let tenant = await getTenant(tenantId);
    if (!tenant) {
      await createTenant(tenantId, {
        name: `Tenant ${tenantId}`,
        plan: 'base',
        status: 'active',
      });
    }

    // Generate connection ID
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Generate auth URL with PKCE
    const { authUrl, state, verifier } = await getAuthUrlWithPKCE(tenantId, connectionId);

    // Store verifier temporarily (expires in 10 minutes)
    pkceStore.set(state, {
      verifier,
      tenantId,
      connectionId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Clean up expired entries
    cleanupExpiredPKCE();

    res.json({
      authUrl,
      state,
      message: 'Please navigate to this URL to sign in with Microsoft',
    });
  } catch (error) {
    console.error('Error starting Microsoft OAuth:', error);
    next(error);
  }
});

/**
 * GET /connect/microsoft/callback
 * Handle OAuth callback from Microsoft with PKCE validation
 * Query params: code, state, error, error_description
 */
router.get('/microsoft/callback', authLimiter, async (req, res, next) => {
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

    // Validate state and get PKCE verifier
    let stateData;
    try {
      stateData = validateState(state);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    // Retrieve PKCE verifier
    const pkceData = pkceStore.get(state);
    if (!pkceData) {
      return res.status(400).json({ error: 'PKCE verifier not found or expired' });
    }

    const { verifier, tenantId, connectionId } = pkceData;

    // Validate state matches stored data
    if (stateData.tenantId !== tenantId || stateData.connectionId !== connectionId) {
      return res.status(400).json({ error: 'State mismatch' });
    }

    // Remove verifier from store (one-time use)
    pkceStore.delete(state);

    // Exchange code for tokens with PKCE
    const tokenResponse = await getTokenFromCodeWithPKCE(code, verifier);

    // Store tokens securely in Secret Manager
    const tokenRef = await storeTokenSecurely(connectionId, {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresOn: tokenResponse.expiresOn,
    });

    // Extract tenant ID from token if available
    const msTenantId = tokenResponse.tenantId || tokenResponse.account?.tenantId || 'unknown';

    // Store connection metadata in Firestore
    await createMsConnection(tenantId, connectionId, {
      msTenantId: msTenantId,
      scopesGranted: SCOPES,
      status: 'active',
      tokenRef: tokenRef,
    });

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/success?tenantId=${tenantId}&connectionId=${connectionId}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error?error=token_exchange_failed`);
  }
});

/**
 * GET /connect/microsoft/status/:tenantId/:connectionId
 * Check connection status
 */
router.get('/microsoft/status/:tenantId/:connectionId', authLimiter, async (req, res, next) => {
  try {
    const { tenantId, connectionId } = req.params;

    const connection = await getMsConnection(tenantId, connectionId);

    if (!connection) {
      return res.json({
        connected: false,
        message: 'Connection not found',
      });
    }

    res.json({
      connected: connection.status === 'active',
      status: connection.status,
      msTenantId: connection.msTenantId,
      scopesGranted: connection.scopesGranted,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /connect/microsoft/revoke/:tenantId/:connectionId
 * Revoke Microsoft connection
 */
router.post('/microsoft/revoke/:tenantId/:connectionId', authLimiter, async (req, res, next) => {
  try {
    const { tenantId, connectionId } = req.params;

    const connection = await getMsConnection(tenantId, connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Update connection status
    await updateMsConnection(tenantId, connectionId, {
      status: 'revoked',
    });

    // Note: In production, we should also delete tokens from Secret Manager
    // await deleteTokenSecurely(connection.tokenRef);

    res.json({
      success: true,
      message: 'Connection revoked successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Clean up expired PKCE verifiers
 */
function cleanupExpiredPKCE() {
  const now = Date.now();
  for (const [key, value] of pkceStore.entries()) {
    if (value.expiresAt < now) {
      pkceStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredPKCE, 5 * 60 * 1000);

export default router;
