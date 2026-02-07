import express from 'express';
import { authenticateUser } from '../auth/middleware.js';
import {
  getAutomationRules,
  createAutomationRule,
  getAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  getProcessLogs,
} from '../services/firebase.js';
import { executeAutomationRule } from '../services/automationEngine.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * GET /api/rules/:userId
 * Get all automation rules for user
 */
router.get('/:userId', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const rules = await getAutomationRules(userId);

    res.json({
      success: true,
      count: rules.length,
      rules,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rules/:userId/:ruleId
 * Get single automation rule
 */
router.get('/:userId/:ruleId', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { ruleId } = req.params;

    const rule = await getAutomationRule(ruleId);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({
      success: true,
      rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rules/:userId
 * Create new automation rule
 */
router.post('/:userId', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const ruleData = req.body;

    // Validation
    if (!ruleData.name) {
      return res.status(400).json({ error: 'Rule name is required' });
    }

    if (!ruleData.targetFolder) {
      return res.status(400).json({ error: 'Target folder is required' });
    }

    const ruleId = await createAutomationRule(userId, ruleData);

    res.status(201).json({
      success: true,
      ruleId,
      message: 'Rule created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/rules/:userId/:ruleId
 * Update automation rule
 */
router.put('/:userId/:ruleId', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId, ruleId } = req.params;
    const updates = req.body;

    // Check if rule exists and belongs to user
    const rule = await getAutomationRule(ruleId);
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    if (rule.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await updateAutomationRule(ruleId, updates);

    res.json({
      success: true,
      message: 'Rule updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/rules/:userId/:ruleId
 * Delete automation rule
 */
router.delete('/:userId/:ruleId', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId, ruleId } = req.params;

    // Check if rule exists and belongs to user
    const rule = await getAutomationRule(ruleId);
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    if (rule.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await deleteAutomationRule(ruleId);

    res.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/rules/:userId/:ruleId/execute
 * Execute automation rule manually
 */
router.post('/:userId/:ruleId/execute', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId, ruleId } = req.params;

    // Check if rule exists and belongs to user
    const rule = await getAutomationRule(ruleId);
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    if (rule.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Execute rule
    const result = await executeAutomationRule(ruleId);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/rules/:userId/logs
 * Get process logs for user
 */
router.get('/:userId/logs', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await getProcessLogs(userId, parseInt(limit));

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
