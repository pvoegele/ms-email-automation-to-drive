import express from 'express';
import { 
  createTenant, 
  getTenant, 
  updateTenant, 
  listTenants 
} from '../services/tenantService.js';
import { 
  createMailbox, 
  getMailbox, 
  updateMailbox, 
  listMailboxes 
} from '../services/mailboxService.js';
import { getUsageEvents, getUsageStatistics } from '../services/usageEventService.js';
import { listMsConnections } from '../services/msConnectionService.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /tenants
 * Create a new tenant
 */
router.post('/', apiLimiter, async (req, res, next) => {
  try {
    const { tenantId, name, plan } = req.body;

    if (!tenantId || !name) {
      return res.status(400).json({ error: 'tenantId and name are required' });
    }

    await createTenant(tenantId, { name, plan });

    res.status(201).json({
      success: true,
      tenantId,
      message: 'Tenant created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tenants
 * List all tenants
 */
router.get('/', apiLimiter, async (req, res, next) => {
  try {
    const tenants = await listTenants();

    res.json({
      success: true,
      count: tenants.length,
      tenants,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tenants/:tenantId
 * Get tenant details
 */
router.get('/:tenantId', apiLimiter, async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const tenant = await getTenant(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      success: true,
      tenant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /tenants/:tenantId
 * Update tenant
 */
router.put('/:tenantId', apiLimiter, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const updates = req.body;

    await updateTenant(tenantId, updates);

    res.json({
      success: true,
      message: 'Tenant updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tenants/:tenantId/connections
 * List Microsoft connections for tenant
 */
router.get('/:tenantId/connections', apiLimiter, async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const connections = await listMsConnections(tenantId);

    res.json({
      success: true,
      count: connections.length,
      connections,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tenants/:tenantId/mailboxes
 * Create a mailbox for tenant
 */
router.post('/:tenantId/mailboxes', apiLimiter, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { mailboxId, connectionId, mailboxAddress } = req.body;

    if (!mailboxId || !connectionId || !mailboxAddress) {
      return res.status(400).json({ 
        error: 'mailboxId, connectionId, and mailboxAddress are required' 
      });
    }

    await createMailbox(tenantId, mailboxId, {
      connectionId,
      mailboxAddress,
    });

    res.status(201).json({
      success: true,
      mailboxId,
      message: 'Mailbox created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tenants/:tenantId/mailboxes
 * List mailboxes for tenant
 */
router.get('/:tenantId/mailboxes', apiLimiter, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.query;

    const mailboxes = await listMailboxes(tenantId, status);

    res.json({
      success: true,
      count: mailboxes.length,
      mailboxes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tenants/:tenantId/mailboxes/:mailboxId
 * Get mailbox details
 */
router.get('/:tenantId/mailboxes/:mailboxId', apiLimiter, async (req, res, next) => {
  try {
    const { tenantId, mailboxId } = req.params;

    const mailbox = await getMailbox(tenantId, mailboxId);

    if (!mailbox) {
      return res.status(404).json({ error: 'Mailbox not found' });
    }

    res.json({
      success: true,
      mailbox,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /tenants/:tenantId/mailboxes/:mailboxId
 * Update mailbox
 */
router.put('/:tenantId/mailboxes/:mailboxId', apiLimiter, async (req, res, next) => {
  try {
    const { tenantId, mailboxId } = req.params;
    const updates = req.body;

    await updateMailbox(tenantId, mailboxId, updates);

    res.json({
      success: true,
      message: 'Mailbox updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tenants/:tenantId/usage
 * Get usage events for tenant
 */
router.get('/:tenantId/usage', apiLimiter, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { limit, startDate, endDate, service } = req.query;

    const options = {
      limit: limit ? parseInt(limit, 10) : 100,
      startDate,
      endDate,
      service,
    };

    const events = await getUsageEvents(tenantId, options);

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tenants/:tenantId/usage/stats
 * Get usage statistics for tenant
 */
router.get('/:tenantId/usage/stats', apiLimiter, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate, service } = req.query;

    const options = {
      startDate,
      endDate,
      service,
    };

    const stats = await getUsageStatistics(tenantId, options);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
