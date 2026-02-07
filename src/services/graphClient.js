import { Client } from '@microsoft/microsoft-graph-client';
import { getUserTokens, storeUserTokens } from './firebase.js';
import { refreshAccessToken } from '../auth/msalConfig.js';

/**
 * Create Microsoft Graph Client with user authentication
 * @param {string} accessToken - User access token
 * @returns {object} Graph client instance
 */
export function createGraphClient(accessToken) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * Get valid access token, refreshing if necessary
 * @param {string} userId - User identifier
 * @returns {Promise<string>} Valid access token
 */
export async function getValidAccessToken(userId) {
  try {
    const tokens = await getUserTokens(userId);

    if (!tokens) {
      throw new Error('User not authenticated');
    }

    // Check if token has expired
    const now = new Date().getTime();
    const expiresOn = new Date(tokens.expiresOn).getTime();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    // Refresh token if expired or expiring soon
    if (now >= expiresOn - bufferTime) {
      console.log('Token expired or expiring soon, refreshing...');
      
      try {
        const newTokens = await refreshAccessToken(tokens.refreshToken);
        
        // Store new tokens
        await storeUserTokens(userId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken || tokens.refreshToken,
          expiresOn: newTokens.expiresOn,
        });

        return newTokens.accessToken;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Token refresh failed. Please re-authenticate.');
      }
    }

    return tokens.accessToken;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    throw error;
  }
}

/**
 * Get authenticated Graph client for user
 * @param {string} userId - User identifier
 * @returns {Promise<object>} Graph client instance
 */
export async function getAuthenticatedClient(userId) {
  const accessToken = await getValidAccessToken(userId);
  return createGraphClient(accessToken);
}

// Email Operations

/**
 * List emails with filters
 * @param {string} userId - User identifier
 * @param {object} options - Filter options
 * @returns {Promise<Array>} Array of email messages
 */
export async function listEmails(userId, options = {}) {
  try {
    const client = await getAuthenticatedClient(userId);
    
    const {
      folder = 'inbox',
      top = 50,
      skip = 0,
      filter = null,
      orderBy = 'receivedDateTime DESC',
    } = options;

    let request = client.api(`/me/mailFolders/${folder}/messages`)
      .top(top)
      .skip(skip)
      .orderby(orderBy)
      .select('id,subject,from,receivedDateTime,hasAttachments,isRead,bodyPreview');

    if (filter) {
      request = request.filter(filter);
    }

    const response = await request.get();
    return response.value || [];
  } catch (error) {
    console.error('Error listing emails:', error);
    throw error;
  }
}

/**
 * Get email by ID
 * @param {string} userId - User identifier
 * @param {string} messageId - Email message ID
 * @returns {Promise<object>} Email message
 */
export async function getEmail(userId, messageId) {
  try {
    const client = await getAuthenticatedClient(userId);
    
    const message = await client.api(`/me/messages/${messageId}`)
      .select('id,subject,from,receivedDateTime,hasAttachments,body,toRecipients,ccRecipients')
      .get();

    return message;
  } catch (error) {
    console.error('Error getting email:', error);
    throw error;
  }
}

/**
 * Get email attachments
 * @param {string} userId - User identifier
 * @param {string} messageId - Email message ID
 * @returns {Promise<Array>} Array of attachments
 */
export async function getEmailAttachments(userId, messageId) {
  try {
    const client = await getAuthenticatedClient(userId);
    
    const response = await client.api(`/me/messages/${messageId}/attachments`)
      .select('id,name,contentType,size')
      .get();

    return response.value || [];
  } catch (error) {
    console.error('Error getting attachments:', error);
    throw error;
  }
}

/**
 * Download email attachment
 * @param {string} userId - User identifier
 * @param {string} messageId - Email message ID
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<object>} Attachment data
 */
export async function downloadAttachment(userId, messageId, attachmentId) {
  try {
    const client = await getAuthenticatedClient(userId);
    
    const attachment = await client.api(`/me/messages/${messageId}/attachments/${attachmentId}`)
      .get();

    return attachment;
  } catch (error) {
    console.error('Error downloading attachment:', error);
    throw error;
  }
}

/**
 * Move email to folder
 * @param {string} userId - User identifier
 * @param {string} messageId - Email message ID
 * @param {string} destinationFolderId - Destination folder ID
 * @returns {Promise<object>} Moved message
 */
export async function moveEmail(userId, messageId, destinationFolderId) {
  try {
    const client = await getAuthenticatedClient(userId);
    
    const movedMessage = await client.api(`/me/messages/${messageId}/move`)
      .post({
        destinationId: destinationFolderId,
      });

    return movedMessage;
  } catch (error) {
    console.error('Error moving email:', error);
    throw error;
  }
}

/**
 * Mark email as read
 * @param {string} userId - User identifier
 * @param {string} messageId - Email message ID
 * @returns {Promise<void>}
 */
export async function markEmailAsRead(userId, messageId) {
  try {
    const client = await getAuthenticatedClient(userId);
    
    await client.api(`/me/messages/${messageId}`)
      .update({
        isRead: true,
      });
  } catch (error) {
    console.error('Error marking email as read:', error);
    throw error;
  }
}

// OneDrive Operations

/**
 * List OneDrive folders
 * @param {string} userId - User identifier
 * @param {string} path - Folder path (default: root)
 * @returns {Promise<Array>} Array of items
 */
export async function listOneDriveFolders(userId, path = '/') {
  try {
    const client = await getAuthenticatedClient(userId);
    
    let request;
    if (path === '/' || path === '') {
      request = client.api('/me/drive/root/children');
    } else {
      request = client.api(`/me/drive/root:${path}:/children`);
    }

    const response = await request
      .select('id,name,folder,file,size,lastModifiedDateTime')
      .get();

    return response.value || [];
  } catch (error) {
    console.error('Error listing OneDrive folders:', error);
    throw error;
  }
}

/**
 * Create OneDrive folder
 * @param {string} userId - User identifier
 * @param {string} folderName - Folder name
 * @param {string} parentPath - Parent folder path
 * @returns {Promise<object>} Created folder
 */
export async function createOneDriveFolder(userId, folderName, parentPath = '/') {
  try {
    const client = await getAuthenticatedClient(userId);
    
    let request;
    if (parentPath === '/' || parentPath === '') {
      request = client.api('/me/drive/root/children');
    } else {
      request = client.api(`/me/drive/root:${parentPath}:/children`);
    }

    const folder = await request.post({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    });

    return folder;
  } catch (error) {
    console.error('Error creating OneDrive folder:', error);
    throw error;
  }
}

/**
 * Upload file to OneDrive (simple upload for files < 4MB)
 * @param {string} userId - User identifier
 * @param {string} fileName - File name
 * @param {Buffer} fileContent - File content as Buffer
 * @param {string} folderPath - Target folder path
 * @returns {Promise<object>} Uploaded file
 */
export async function uploadFileToOneDrive(userId, fileName, fileContent, folderPath = '/') {
  try {
    const client = await getAuthenticatedClient(userId);
    
    // For files > 4MB, use chunked upload
    const fileSize = fileContent.length;
    const maxSimpleUploadSize = 4 * 1024 * 1024; // 4MB

    if (fileSize > maxSimpleUploadSize) {
      return await uploadLargeFileToOneDrive(userId, fileName, fileContent, folderPath);
    }

    let uploadPath;
    if (folderPath === '/' || folderPath === '') {
      uploadPath = `/me/drive/root:/${fileName}:/content`;
    } else {
      uploadPath = `/me/drive/root:${folderPath}/${fileName}:/content`;
    }

    const uploadedFile = await client.api(uploadPath)
      .put(fileContent);

    return uploadedFile;
  } catch (error) {
    console.error('Error uploading file to OneDrive:', error);
    throw error;
  }
}

/**
 * Upload large file to OneDrive using chunked upload (files > 4MB)
 * @param {string} userId - User identifier
 * @param {string} fileName - File name
 * @param {Buffer} fileContent - File content as Buffer
 * @param {string} folderPath - Target folder path
 * @returns {Promise<object>} Uploaded file
 */
export async function uploadLargeFileToOneDrive(userId, fileName, fileContent, folderPath = '/') {
  try {
    const client = await getAuthenticatedClient(userId);
    
    // Create upload session
    let uploadSessionPath;
    if (folderPath === '/' || folderPath === '') {
      uploadSessionPath = `/me/drive/root:/${fileName}:/createUploadSession`;
    } else {
      uploadSessionPath = `/me/drive/root:${folderPath}/${fileName}:/createUploadSession`;
    }

    const uploadSession = await client.api(uploadSessionPath)
      .post({
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
    console.error('Error uploading large file to OneDrive:', error);
    throw error;
  }
}

/**
 * Get OneDrive folder by path
 * @param {string} userId - User identifier
 * @param {string} path - Folder path
 * @returns {Promise<object>} Folder item
 */
export async function getOneDriveFolder(userId, path) {
  try {
    const client = await getAuthenticatedClient(userId);
    
    let request;
    if (path === '/' || path === '') {
      request = client.api('/me/drive/root');
    } else {
      request = client.api(`/me/drive/root:${path}`);
    }

    const folder = await request.get();
    return folder;
  } catch (error) {
    // Folder doesn't exist
    if (error.statusCode === 404) {
      return null;
    }
    console.error('Error getting OneDrive folder:', error);
    throw error;
  }
}
