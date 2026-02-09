import { getMsConnection } from './msConnectionService.js';
import { retrieveTokenSecurely } from './secretManager.js';
import { createGraphClient } from './graphClient.js';

/**
 * SharePoint Service
 * Handles file uploads to SharePoint with specific path structure
 * Path format: /Shared Documents/MailArchive/YYYY/MM/filename
 */

/**
 * Upload attachment to SharePoint
 * @param {string} tenantId - Tenant identifier
 * @param {object} message - Email message object
 * @param {object} attachment - Attachment object
 * @param {Buffer} fileContent - File content as Buffer
 * @returns {Promise<object>} Upload result with path
 */
export async function uploadAttachmentToSharePoint(tenantId, message, attachment, fileContent) {
  try {
    // Get active connection
    const { getActiveMsConnection } = await import('./msConnectionService.js');
    const connection = await getActiveMsConnection(tenantId);
    
    if (!connection) {
      throw new Error('No active Microsoft connection found');
    }

    // Get access token
    const tokens = await retrieveTokenSecurely(connection.tokenRef);
    const client = createGraphClient(tokens.accessToken);

    // Generate path based on message date
    const messageDate = new Date(message.receivedDateTime);
    const year = messageDate.getFullYear();
    const month = String(messageDate.getMonth() + 1).padStart(2, '0');
    
    // Base path for SharePoint
    const basePath = `/Shared Documents/MailArchive/${year}/${month}`;
    
    // Ensure folder structure exists
    await ensureFolderStructure(client, year, month);

    // Generate unique filename if needed
    const fileName = sanitizeFileName(attachment.name);
    const filePath = `${basePath}/${fileName}`;

    // Upload file to SharePoint
    const uploadedFile = await uploadToSharePoint(client, filePath, fileContent);

    console.log(`File uploaded to SharePoint: ${filePath}`);

    return {
      path: filePath,
      fileName: fileName,
      fileId: uploadedFile.id,
      size: uploadedFile.size,
      webUrl: uploadedFile.webUrl,
    };
  } catch (error) {
    console.error('Error uploading to SharePoint:', error);
    throw error;
  }
}

/**
 * Ensure folder structure exists in SharePoint
 * @param {object} client - Graph API client
 * @param {number} year - Year
 * @param {string} month - Month (MM format)
 */
async function ensureFolderStructure(client, year, month) {
  try {
    // Check/create MailArchive folder
    await ensureFolder(client, '/Shared Documents', 'MailArchive');
    
    // Check/create year folder
    await ensureFolder(client, '/Shared Documents/MailArchive', year.toString());
    
    // Check/create month folder
    await ensureFolder(client, `/Shared Documents/MailArchive/${year}`, month);
    
    console.log(`Ensured folder structure: /Shared Documents/MailArchive/${year}/${month}`);
  } catch (error) {
    console.error('Error ensuring folder structure:', error);
    throw error;
  }
}

/**
 * Ensure a folder exists, create if not
 * @param {object} client - Graph API client
 * @param {string} parentPath - Parent folder path
 * @param {string} folderName - Folder name to create
 */
async function ensureFolder(client, parentPath, folderName) {
  try {
    // Try to get the folder
    const folderPath = `${parentPath}/${folderName}`;
    
    try {
      await client.api(`/me/drive/root:${folderPath}`).get();
      // Folder exists
      return;
    } catch (error) {
      if (error.statusCode === 404) {
        // Folder doesn't exist, create it
        let createRequest;
        if (parentPath === '/Shared Documents') {
          // Special case for root of Shared Documents
          createRequest = client.api('/me/drive/root/children');
        } else {
          createRequest = client.api(`/me/drive/root:${parentPath}:/children`);
        }

        await createRequest.post({
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        });
        
        console.log(`Created folder: ${folderPath}`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error ensuring folder ${folderName}:`, error);
    throw error;
  }
}

/**
 * Upload file to SharePoint
 * @param {object} client - Graph API client
 * @param {string} filePath - Full file path in SharePoint
 * @param {Buffer} fileContent - File content as Buffer
 * @returns {Promise<object>} Uploaded file object
 */
async function uploadToSharePoint(client, filePath, fileContent) {
  try {
    const fileSize = fileContent.length;
    const maxSimpleUploadSize = 4 * 1024 * 1024; // 4MB

    // For small files, use simple upload
    if (fileSize <= maxSimpleUploadSize) {
      const uploadPath = `/me/drive/root:${filePath}:/content`;
      const uploadedFile = await client.api(uploadPath)
        .header('Content-Type', 'application/octet-stream')
        .put(fileContent);
      
      return uploadedFile;
    } else {
      // For large files, use chunked upload
      return await uploadLargeFile(client, filePath, fileContent);
    }
  } catch (error) {
    console.error('Error uploading file to SharePoint:', error);
    throw error;
  }
}

/**
 * Upload large file using chunked upload
 * @param {object} client - Graph API client
 * @param {string} filePath - Full file path in SharePoint
 * @param {Buffer} fileContent - File content as Buffer
 * @returns {Promise<object>} Uploaded file object
 */
async function uploadLargeFile(client, filePath, fileContent) {
  try {
    // Create upload session
    const uploadSessionPath = `/me/drive/root:${filePath}:/createUploadSession`;
    const uploadSession = await client.api(uploadSessionPath).post({
      item: {
        '@microsoft.graph.conflictBehavior': 'rename',
      },
    });

    const uploadUrl = uploadSession.uploadUrl;
    const fileSize = fileContent.length;
    const chunkSize = 320 * 1024; // 320KB chunks
    let offset = 0;

    // Upload chunks
    while (offset < fileSize) {
      const chunk = fileContent.slice(offset, offset + chunkSize);
      const contentLength = chunk.length;
      const contentRange = `bytes ${offset}-${offset + contentLength - 1}/${fileSize}`;

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': contentLength.toString(),
          'Content-Range': contentRange,
        },
        body: chunk,
      });

      if (!response.ok && response.status !== 202) {
        throw new Error(`Upload chunk failed: ${response.statusText}`);
      }

      offset += chunkSize;

      // Last chunk returns the file info
      if (offset >= fileSize) {
        const uploadedFile = await response.json();
        return uploadedFile;
      }
    }
  } catch (error) {
    console.error('Error uploading large file:', error);
    throw error;
  }
}

/**
 * Sanitize filename to remove invalid characters
 * @param {string} fileName - Original file name
 * @returns {string} Sanitized file name
 */
function sanitizeFileName(fileName) {
  // Remove or replace invalid characters for SharePoint
  // SharePoint doesn't allow: " * : < > ? / \ |
  let sanitized = fileName.replace(/["*:<>?\/\\|]/g, '_');
  
  // Limit length
  if (sanitized.length > 128) {
    const extension = sanitized.substring(sanitized.lastIndexOf('.'));
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExt.substring(0, 128 - extension.length) + extension;
  }
  
  return sanitized;
}

/**
 * Get SharePoint site information
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<object>} Site information
 */
export async function getSharePointSiteInfo(tenantId) {
  try {
    const connection = await getMsConnection(tenantId);
    if (!connection) {
      throw new Error('No Microsoft connection found');
    }

    const tokens = await retrieveTokenSecurely(connection.tokenRef);
    const client = createGraphClient(tokens.accessToken);

    const drive = await client.api('/me/drive').get();
    
    return {
      driveId: drive.id,
      driveName: drive.name,
      driveType: drive.driveType,
      webUrl: drive.webUrl,
    };
  } catch (error) {
    console.error('Error getting SharePoint site info:', error);
    throw error;
  }
}
