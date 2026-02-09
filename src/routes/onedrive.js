import express from 'express';
import { authenticateUser } from '../auth/middleware.js';
import {
  listOneDriveFolders,
  createOneDriveFolder,
  uploadFileToOneDrive,
} from '../services/graphClient.js';
import { apiLimiter, uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @swagger
 * /api/onedrive/{userId}/folders:
 *   get:
 *     summary: List OneDrive folders
 *     tags: [OneDrive]
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
 *         name: path
 *         schema:
 *           type: string
 *           default: /
 *         description: Folder path to list
 *     responses:
 *       200:
 *         description: Folders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 path:
 *                   type: string
 *                 count:
 *                   type: number
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OneDriveItem'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 */
router.get('/:userId/folders', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { path = '/' } = req.query;

    const items = await listOneDriveFolders(userId, path);

    res.json({
      success: true,
      path,
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/onedrive/{userId}/folders:
 *   post:
 *     summary: Create OneDrive folder
 *     tags: [OneDrive]
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
 *               - folderName
 *             properties:
 *               folderName:
 *                 type: string
 *                 description: Name of the folder to create
 *               parentPath:
 *                 type: string
 *                 default: /
 *                 description: Parent folder path
 *     responses:
 *       200:
 *         description: Folder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 folder:
 *                   $ref: '#/components/schemas/OneDriveItem'
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 */
router.post('/:userId/folders', apiLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { folderName, parentPath = '/' } = req.body;

    if (!folderName) {
      return res.status(400).json({ error: 'folderName is required' });
    }

    const folder = await createOneDriveFolder(userId, folderName, parentPath);

    res.json({
      success: true,
      folder,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/onedrive/{userId}/upload:
 *   post:
 *     summary: Upload file to OneDrive
 *     tags: [OneDrive]
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
 *               - fileName
 *               - fileContent
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Name of the file to upload
 *               fileContent:
 *                 type: string
 *                 format: base64
 *                 description: File content as base64 string
 *               folderPath:
 *                 type: string
 *                 default: /
 *                 description: Target folder path
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 file:
 *                   $ref: '#/components/schemas/OneDriveItem'
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized - Invalid or missing authentication
 */
router.post('/:userId/upload', uploadLimiter, authenticateUser, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { fileName, fileContent, folderPath = '/' } = req.body;

    if (!fileName || !fileContent) {
      return res.status(400).json({ error: 'fileName and fileContent are required' });
    }

    // Convert base64 to buffer if necessary
    let buffer;
    if (typeof fileContent === 'string') {
      buffer = Buffer.from(fileContent, 'base64');
    } else {
      buffer = fileContent;
    }

    const uploadedFile = await uploadFileToOneDrive(userId, fileName, buffer, folderPath);

    res.json({
      success: true,
      file: uploadedFile,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
