import crypto from 'crypto';
import { getAllActiveMailboxes, updateMailboxCursor } from './mailboxService.js';
import { getMsConnection } from './msConnectionService.js';
import { retrieveTokenSecurely } from './secretManager.js';
import { createGraphClient } from './graphClient.js';
import { refreshAccessToken } from '../auth/msalConfig.js';
import { storeTokenSecurely } from './secretManager.js';
import { updateMsConnection } from './msConnectionService.js';
import { usageEventExists, createUsageEvent } from './usageEventService.js';
import { uploadAttachmentToSharePoint } from './sharePointService.js';

/**
 * Mailbox Polling Service
 * Polls mailboxes for new emails with attachments and processes them
 */

let pollingInterval = null;

/**
 * Start mailbox polling
 * @param {number} intervalMinutes - Polling interval in minutes (default: 5)
 */
export function startPolling(intervalMinutes = 5) {
  if (pollingInterval) {
    console.log('Polling already running');
    return;
  }

  console.log(`Starting mailbox polling with ${intervalMinutes} minute interval`);

  // Run immediately
  pollAllMailboxes();

  // Schedule regular polling
  pollingInterval = setInterval(() => {
    pollAllMailboxes();
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stop mailbox polling
 */
export function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('Mailbox polling stopped');
  }
}

/**
 * Poll all active mailboxes
 */
export async function pollAllMailboxes() {
  try {
    console.log('Starting mailbox poll cycle...');
    const startTime = Date.now();

    const activeMailboxes = await getAllActiveMailboxes();
    console.log(`Found ${activeMailboxes.length} active mailboxes`);

    let totalProcessed = 0;
    let totalAttachments = 0;
    let totalErrors = 0;

    for (const mailbox of activeMailboxes) {
      try {
        const result = await pollMailbox(mailbox);
        totalProcessed += result.emailsProcessed;
        totalAttachments += result.attachmentsProcessed;
      } catch (error) {
        console.error(`Error polling mailbox ${mailbox.mailboxId}:`, error);
        totalErrors++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Poll cycle completed in ${duration}ms: ${totalProcessed} emails, ${totalAttachments} attachments, ${totalErrors} errors`);
  } catch (error) {
    console.error('Error in poll cycle:', error);
  }
}

/**
 * Poll a single mailbox
 * @param {object} mailbox - Mailbox data with tenantId, mailboxId, connectionId, lastCursor
 * @returns {Promise<object>} Processing result
 */
export async function pollMailbox(mailbox) {
  const { tenantId, mailboxId, connectionId, lastCursor } = mailbox;

  console.log(`Polling mailbox: ${mailboxId} for tenant: ${tenantId}`);

  try {
    // Get connection
    const connection = await getMsConnection(tenantId, connectionId);
    if (!connection || connection.status !== 'active') {
      console.log(`Connection not active for mailbox: ${mailboxId}`);
      return { emailsProcessed: 0, attachmentsProcessed: 0 };
    }

    // Get access token
    const tokens = await retrieveTokenSecurely(connection.tokenRef);
    let accessToken = tokens.accessToken;

    // Check if token needs refresh
    const now = new Date().getTime();
    const expiresOn = new Date(tokens.expiresOn).getTime();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (now >= expiresOn - bufferTime) {
      console.log('Refreshing token...');
      const newTokens = await refreshAccessToken(tokens.refreshToken);
      
      // Store new tokens
      const newTokenRef = await storeTokenSecurely(connectionId, {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken || tokens.refreshToken,
        expiresOn: newTokens.expiresOn,
      });

      // Update connection with new token reference
      await updateMsConnection(tenantId, connectionId, {
        tokenRef: newTokenRef,
      });

      accessToken = newTokens.accessToken;
    }

    // Create Graph client
    const client = createGraphClient(accessToken);

    // Build filter for messages with attachments
    let filter = 'hasAttachments eq true';
    
    // Add cursor filter if exists
    if (lastCursor) {
      filter += ` and receivedDateTime gt ${lastCursor}`;
    }

    // Fetch messages
    const response = await client.api('/me/messages')
      .filter(filter)
      .select('id,subject,from,receivedDateTime,hasAttachments')
      .orderby('receivedDateTime ASC')
      .top(50)
      .get();

    const messages = response.value || [];
    console.log(`Found ${messages.length} messages with attachments`);

    let emailsProcessed = 0;
    let attachmentsProcessed = 0;
    let newCursor = lastCursor;

    for (const message of messages) {
      try {
        // Process message attachments
        const result = await processMessageAttachments(client, tenantId, message);
        attachmentsProcessed += result.attachmentsProcessed;
        emailsProcessed++;

        // Update cursor to latest message time
        newCursor = message.receivedDateTime;
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
      }
    }

    // Update cursor if we processed messages
    if (newCursor && newCursor !== lastCursor) {
      await updateMailboxCursor(tenantId, mailboxId, newCursor);
      console.log(`Updated cursor for mailbox ${mailboxId} to ${newCursor}`);
    }

    return { emailsProcessed, attachmentsProcessed };
  } catch (error) {
    console.error(`Error polling mailbox ${mailboxId}:`, error);
    throw error;
  }
}

/**
 * Process attachments for a message
 * @param {object} client - Graph API client
 * @param {string} tenantId - Tenant identifier
 * @param {object} message - Message object
 * @returns {Promise<object>} Processing result
 */
async function processMessageAttachments(client, tenantId, message) {
  let attachmentsProcessed = 0;

  try {
    // Get attachments
    const attachmentsResponse = await client.api(`/me/messages/${message.id}/attachments`)
      .select('id,name,contentType,size,contentBytes')
      .get();

    const attachments = attachmentsResponse.value || [];
    console.log(`Processing ${attachments.length} attachments for message ${message.id}`);

    for (const attachment of attachments) {
      try {
        // Create sourceId for deduplication
        const sourceId = `${message.id}_${attachment.id}`;

        // Check if already processed
        const exists = await usageEventExists(tenantId, sourceId);
        if (exists) {
          console.log(`Attachment already processed: ${sourceId}`);
          continue;
        }

        // Calculate hash for deduplication
        const contentBytes = attachment.contentBytes;
        if (!contentBytes) {
          console.log(`No content bytes for attachment: ${attachment.id}`);
          continue;
        }

        const buffer = Buffer.from(contentBytes, 'base64');
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');

        // Upload to SharePoint
        const uploadResult = await uploadAttachmentToSharePoint(
          tenantId,
          message,
          attachment,
          buffer
        );

        // Create usage event
        await createUsageEvent(tenantId, {
          service: 'mail_archive',
          metric: 'attachment_stored',
          quantity: 1,
          sourceId: sourceId,
          metadata: {
            messageId: message.id,
            attachmentId: attachment.id,
            fileName: attachment.name,
            fileSize: attachment.size,
            hash: hash,
            uploadPath: uploadResult.path,
          },
        });

        attachmentsProcessed++;
        console.log(`Processed attachment: ${attachment.name}`);
      } catch (error) {
        console.error(`Error processing attachment ${attachment.id}:`, error);
      }
    }

    return { attachmentsProcessed };
  } catch (error) {
    console.error(`Error processing attachments for message ${message.id}:`, error);
    return { attachmentsProcessed };
  }
}
