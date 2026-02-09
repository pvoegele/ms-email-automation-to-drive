import express from 'express';
import { authenticateUser } from '../auth/middleware.js';
import { listEmails, getEmail, getEmailAttachments } from '../services/graphClient.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @swagger
 * /api/emails/{userId}:
 *   get:
 *     summary: List emails with filters
 *     tags: [Emails]
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
 *         name: folder
 *         schema:
 *           type: string
 *           default: inbox
 *         description: Email folder (inbox, sent, drafts, etc.)
 *       - in: query
 *         name: top
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of emails to retrieve
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of emails to skip
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: OData filter query
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           default: receivedDateTime DESC
 *         description: Order by clause
 *     responses:
 *       200:
 *         description: List of emails retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailList'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
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
 * @swagger
 * /api/emails/{userId}/{messageId}:
 *   get:
 *     summary: Get single email by ID
 *     tags: [Emails]
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
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Email message ID
 *     responses:
 *       200:
 *         description: Email retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 email:
 *                   $ref: '#/components/schemas/Email'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 *       404:
 *         description: Email not found
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
 * @swagger
 * /api/emails/{userId}/{messageId}/attachments:
 *   get:
 *     summary: Get email attachments
 *     tags: [Emails]
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
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Email message ID
 *     responses:
 *       200:
 *         description: Attachments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 attachments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attachment'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
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
