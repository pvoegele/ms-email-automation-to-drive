import {
  listEmails,
  getEmailAttachments,
  downloadAttachment,
  moveEmail,
  markEmailAsRead,
  createOneDriveFolder,
  uploadFileToOneDrive,
  getOneDriveFolder,
} from './graphClient.js';
import {
  getAutomationRule,
  updateRuleStats,
  createProcessLog,
} from './firebase.js';

/**
 * Execute automation rule
 * @param {string} ruleId - Rule identifier
 * @returns {Promise<object>} Execution result
 */
export async function executeAutomationRule(ruleId) {
  const startTime = Date.now();
  let emailsProcessed = 0;
  let attachmentsSaved = 0;
  const errors = [];

  try {
    // Get rule details
    const rule = await getAutomationRule(ruleId);

    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    if (!rule.enabled) {
      return {
        success: false,
        message: 'Rule is disabled',
      };
    }

    console.log(`Executing rule: ${rule.name} (${ruleId})`);

    // Fetch emails based on rule filters
    const emails = await fetchFilteredEmails(rule);

    console.log(`Found ${emails.length} emails matching rule criteria`);

    // Process each email
    for (const email of emails) {
      try {
        await processEmail(rule, email);
        emailsProcessed++;
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        errors.push({
          emailId: email.id,
          subject: email.subject,
          error: error.message,
        });
      }
    }

    // Count total attachments saved
    for (const email of emails) {
      if (email.hasAttachments) {
        try {
          const attachments = await getEmailAttachments(rule.userId, email.id);
          
          // Filter attachments based on rule
          const filteredAttachments = filterAttachments(attachments, rule.filters);
          attachmentsSaved += filteredAttachments.length;
        } catch (error) {
          // Continue if attachment counting fails
        }
      }
    }

    // Update rule statistics
    await updateRuleStats(ruleId, {
      emailsProcessed,
      attachmentsSaved,
      errors: errors.length,
    });

    // Create process log
    await createProcessLog({
      userId: rule.userId,
      ruleId,
      emailsProcessed,
      attachmentsSaved,
      errors,
      success: errors.length === 0,
    });

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      emailsProcessed,
      attachmentsSaved,
      errors,
      executionTime,
    };
  } catch (error) {
    console.error('Error executing automation rule:', error);

    // Create error log
    try {
      const rule = await getAutomationRule(ruleId);
      if (rule) {
        await createProcessLog({
          userId: rule.userId,
          ruleId,
          emailsProcessed,
          attachmentsSaved,
          errors: [{ error: error.message }],
          success: false,
        });
      }
    } catch (logError) {
      console.error('Error creating error log:', logError);
    }

    throw error;
  }
}

/**
 * Fetch emails matching rule filters
 * @param {object} rule - Automation rule
 * @returns {Promise<Array>} Filtered emails
 */
async function fetchFilteredEmails(rule) {
  try {
    const filters = rule.filters || {};
    let graphFilter = null;

    // Build OData filter query
    const filterParts = [];

    // Filter by sender
    if (filters.senderEmail) {
      filterParts.push(`from/emailAddress/address eq '${filters.senderEmail}'`);
    }

    // Filter by subject
    if (filters.subject) {
      filterParts.push(`contains(subject, '${filters.subject}')`);
    }

    // Filter by has attachments
    if (filters.hasAttachments) {
      filterParts.push('hasAttachments eq true');
    }

    // Filter by date
    if (filters.dateFrom) {
      filterParts.push(`receivedDateTime ge ${filters.dateFrom}`);
    }

    if (filters.dateTo) {
      filterParts.push(`receivedDateTime le ${filters.dateTo}`);
    }

    if (filterParts.length > 0) {
      graphFilter = filterParts.join(' and ');
    }

    // Fetch emails
    const emails = await listEmails(rule.userId, {
      folder: rule.sourceFolder || 'inbox',
      top: 100,
      filter: graphFilter,
    });

    return emails;
  } catch (error) {
    console.error('Error fetching filtered emails:', error);
    throw error;
  }
}

/**
 * Process single email
 * @param {object} rule - Automation rule
 * @param {object} email - Email message
 * @returns {Promise<void>}
 */
async function processEmail(rule, email) {
  try {
    console.log(`Processing email: ${email.subject}`);

    // Skip if no attachments and rule requires them
    if (!email.hasAttachments && rule.filters?.attachmentExtensions?.length > 0) {
      console.log('Email has no attachments, skipping');
      return;
    }

    // Get attachments if present
    if (email.hasAttachments) {
      const attachments = await getEmailAttachments(rule.userId, email.id);

      // Filter attachments based on rule
      const filteredAttachments = filterAttachments(attachments, rule.filters);

      if (filteredAttachments.length === 0) {
        console.log('No attachments match filter criteria');
        return;
      }

      // Determine target folder path
      const targetFolderPath = await determineTargetFolder(rule, email);

      // Ensure target folder exists
      await ensureFolderExists(rule.userId, targetFolderPath);

      // Download and upload each attachment
      for (const attachment of filteredAttachments) {
        try {
          await processAttachment(rule.userId, email.id, attachment, targetFolderPath);
        } catch (error) {
          console.error(`Error processing attachment ${attachment.name}:`, error);
          throw error;
        }
      }
    }

    // Mark email as read (optional)
    if (rule.markAsRead !== false) {
      await markEmailAsRead(rule.userId, email.id);
    }

    console.log(`Email processed successfully: ${email.subject}`);
  } catch (error) {
    console.error('Error processing email:', error);
    throw error;
  }
}

/**
 * Filter attachments based on rule criteria
 * @param {Array} attachments - Array of attachments
 * @param {object} filters - Rule filters
 * @returns {Array} Filtered attachments
 */
function filterAttachments(attachments, filters) {
  if (!filters) {
    return attachments;
  }

  let filtered = attachments;

  // Filter by file extension
  if (filters.attachmentExtensions && filters.attachmentExtensions.length > 0) {
    filtered = filtered.filter(att => {
      const ext = att.name.split('.').pop().toLowerCase();
      return filters.attachmentExtensions.includes(ext);
    });
  }

  // Filter by file size
  if (filters.maxFileSize) {
    filtered = filtered.filter(att => att.size <= filters.maxFileSize);
  }

  if (filters.minFileSize) {
    filtered = filtered.filter(att => att.size >= filters.minFileSize);
  }

  return filtered;
}

/**
 * Determine target folder path based on rule configuration
 * @param {object} rule - Automation rule
 * @param {object} email - Email message
 * @returns {Promise<string>} Target folder path
 */
async function determineTargetFolder(rule, email) {
  let targetPath = rule.targetFolder || '/EmailAttachments';

  // Replace variables in path
  if (targetPath.includes('{sender}')) {
    const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown';
    const sanitizedSender = senderName.replace(/[<>:"/\\|?*]/g, '_');
    targetPath = targetPath.replace('{sender}', sanitizedSender);
  }

  if (targetPath.includes('{date}')) {
    const date = new Date(email.receivedDateTime);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    targetPath = targetPath.replace('{date}', dateStr);
  }

  if (targetPath.includes('{year}')) {
    const year = new Date(email.receivedDateTime).getFullYear();
    targetPath = targetPath.replace('{year}', year.toString());
  }

  if (targetPath.includes('{month}')) {
    const month = new Date(email.receivedDateTime).getMonth() + 1;
    targetPath = targetPath.replace('{month}', String(month).padStart(2, '0'));
  }

  // Ensure path starts with /
  if (!targetPath.startsWith('/')) {
    targetPath = '/' + targetPath;
  }

  return targetPath;
}

/**
 * Ensure OneDrive folder exists, create if not
 * @param {string} userId - User identifier
 * @param {string} folderPath - Folder path
 * @returns {Promise<void>}
 */
async function ensureFolderExists(userId, folderPath) {
  try {
    // Check if folder exists
    const folder = await getOneDriveFolder(userId, folderPath);

    if (folder) {
      return;
    }

    // Create folder hierarchy
    const pathParts = folderPath.split('/').filter(p => p);
    let currentPath = '';

    for (const part of pathParts) {
      currentPath += '/' + part;
      
      const exists = await getOneDriveFolder(userId, currentPath);
      
      if (!exists) {
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
        await createOneDriveFolder(userId, part, parentPath);
      }
    }
  } catch (error) {
    console.error('Error ensuring folder exists:', error);
    throw error;
  }
}

/**
 * Process and upload attachment to OneDrive
 * @param {string} userId - User identifier
 * @param {string} messageId - Email message ID
 * @param {object} attachment - Attachment object
 * @param {string} targetFolderPath - Target folder path
 * @returns {Promise<void>}
 */
async function processAttachment(userId, messageId, attachment, targetFolderPath) {
  try {
    console.log(`Downloading attachment: ${attachment.name}`);

    // Download attachment
    const attachmentData = await downloadAttachment(userId, messageId, attachment.id);

    // Get content bytes
    let contentBytes;
    if (attachmentData.contentBytes) {
      contentBytes = Buffer.from(attachmentData.contentBytes, 'base64');
    } else {
      throw new Error('No content bytes in attachment data');
    }

    console.log(`Uploading attachment to OneDrive: ${attachment.name}`);

    // Upload to OneDrive
    await uploadFileToOneDrive(userId, attachment.name, contentBytes, targetFolderPath);

    console.log(`Attachment uploaded successfully: ${attachment.name}`);
  } catch (error) {
    console.error('Error processing attachment:', error);
    throw error;
  }
}

/**
 * Check if rule should be executed based on schedule
 * @param {object} rule - Automation rule
 * @returns {boolean} Should execute
 */
export function shouldExecuteRule(rule) {
  if (!rule.enabled) {
    return false;
  }

  if (rule.schedule === 'manual') {
    return false; // Manual rules don't auto-execute
  }

  // Check interval-based schedule
  if (rule.schedule?.type === 'interval' && rule.schedule?.intervalMinutes) {
    if (!rule.lastRun) {
      return true; // Never run before
    }

    const lastRunTime = new Date(rule.lastRun).getTime();
    const now = Date.now();
    const intervalMs = rule.schedule.intervalMinutes * 60 * 1000;

    return now - lastRunTime >= intervalMs;
  }

  return false;
}
