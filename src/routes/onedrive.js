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
 * GET /api/onedrive/:userId/folders
 * List OneDrive folders
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
 * POST /api/onedrive/:userId/folders
 * Create OneDrive folder
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
 * POST /api/onedrive/:userId/upload
 * Upload file to OneDrive
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
