import express from 'express';
import { authenticateUser } from '../auth/middleware.js';
import { listEmails, getEmail, getEmailAttachments } from '../services/graphClient.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * GET /api/emails/:userId
 * List emails with filters
 */
router.get('/:userId', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      folder = 'inbox',
      top = 50,
      skip = 0,
      filter = null,
      orderBy = 'receivedDateTime DESC',
    } = req.query;

    const emails = await listEmails(userId, {
      folder,
      top: parseInt(top),
      skip: parseInt(skip),
      filter,
      orderBy,
    });

    res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emails/:userId/:messageId
 * Get single email by ID
 */
router.get('/:userId/:messageId', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId, messageId } = req.params;

    const email = await getEmail(userId, messageId);

    res.json({
      success: true,
      email,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/emails/:userId/:messageId/attachments
 * Get email attachments
 */
router.get('/:userId/:messageId/attachments', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId, messageId } = req.params;

    const attachments = await getEmailAttachments(userId, messageId);

    res.json({
      success: true,
      count: attachments.length,
      attachments,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
