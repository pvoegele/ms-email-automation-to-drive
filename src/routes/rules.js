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
 * @swagger
 * /api/rules/{userId}:
 *   get:
 *     summary: Get all automation rules for user
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *     responses:
 *       200:
 *         description: Rules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 rules:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AutomationRule'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
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
 * @swagger
 * /api/rules/{userId}/{ruleId}:
 *   get:
 *     summary: Get single automation rule
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule ID
 *     responses:
 *       200:
 *         description: Rule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 rule:
 *                   $ref: '#/components/schemas/AutomationRule'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 *       404:
 *         description: Rule not found
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
 * @swagger
 * /api/rules/{userId}:
 *   post:
 *     summary: Create new automation rule
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - targetFolder
 *             properties:
 *               name:
 *                 type: string
 *                 description: Rule name
 *               targetFolder:
 *                 type: string
 *                 description: Target OneDrive folder path
 *               enabled:
 *                 type: boolean
 *                 default: true
 *               filters:
 *                 type: object
 *                 description: Email filter criteria
 *     responses:
 *       201:
 *         description: Rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 ruleId:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
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
 * @swagger
 * /api/rules/{userId}/{ruleId}:
 *   put:
 *     summary: Update automation rule
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               targetFolder:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               filters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Rule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 *       403:
 *         description: Access denied
 *       404:
 *         description: Rule not found
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
 * @swagger
 * /api/rules/{userId}/{ruleId}:
 *   delete:
 *     summary: Delete automation rule
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule ID
 *     responses:
 *       200:
 *         description: Rule deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 *       403:
 *         description: Access denied
 *       404:
 *         description: Rule not found
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
 * @swagger
 * /api/rules/{userId}/{ruleId}/execute:
 *   post:
 *     summary: Execute automation rule manually
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule ID
 *     responses:
 *       200:
 *         description: Rule executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: object
 *                   description: Execution result with processed emails count
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 *       403:
 *         description: Access denied
 *       404:
 *         description: Rule not found
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
 * @swagger
 * /api/rules/{userId}/logs:
 *   get:
 *     summary: Get process logs for user
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of logs to retrieve
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
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
