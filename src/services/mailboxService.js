import admin from 'firebase-admin';
import { getDb } from './firebase.js';

/**
 * Mailbox Service
 * Manages mailboxes for tenants
 */

/**
 * Create or update mailbox
 * @param {string} tenantId - Tenant identifier
 * @param {string} mailboxId - Mailbox identifier
 * @param {object} mailboxData - Mailbox data
 * @returns {Promise<void>}
 */
export async function createMailbox(tenantId, mailboxId, mailboxData) {
  try {
    const db = getDb();
    const mailboxRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('mailboxes')
      .doc(mailboxId);

    await mailboxRef.set({
      connectionId: mailboxData.connectionId,
      mailboxAddress: mailboxData.mailboxAddress,
      lastCursor: mailboxData.lastCursor || null,
      status: mailboxData.status || 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Mailbox created: ${mailboxId} for tenant: ${tenantId}`);
  } catch (error) {
    console.error('Error creating mailbox:', error);
    throw error;
  }
}

/**
 * Get mailbox
 * @param {string} tenantId - Tenant identifier
 * @param {string} mailboxId - Mailbox identifier
 * @returns {Promise<object|null>} Mailbox object or null
 */
export async function getMailbox(tenantId, mailboxId) {
  try {
    const db = getDb();
    const mailboxDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('mailboxes')
      .doc(mailboxId)
      .get();

    if (!mailboxDoc.exists) {
      return null;
    }

    return {
      id: mailboxDoc.id,
      ...mailboxDoc.data(),
    };
  } catch (error) {
    console.error('Error getting mailbox:', error);
    throw error;
  }
}

/**
 * Update mailbox
 * @param {string} tenantId - Tenant identifier
 * @param {string} mailboxId - Mailbox identifier
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateMailbox(tenantId, mailboxId, updates) {
  try {
    const db = getDb();
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('mailboxes')
      .doc(mailboxId)
      .update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Mailbox updated: ${mailboxId}`);
  } catch (error) {
    console.error('Error updating mailbox:', error);
    throw error;
  }
}

/**
 * Update mailbox cursor
 * @param {string} tenantId - Tenant identifier
 * @param {string} mailboxId - Mailbox identifier
 * @param {string} cursor - New cursor value (ISO timestamp)
 * @returns {Promise<void>}
 */
export async function updateMailboxCursor(tenantId, mailboxId, cursor) {
  try {
    const db = getDb();
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('mailboxes')
      .doc(mailboxId)
      .update({
        lastCursor: cursor,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Mailbox cursor updated: ${mailboxId} to ${cursor}`);
  } catch (error) {
    console.error('Error updating mailbox cursor:', error);
    throw error;
  }
}

/**
 * List mailboxes for a tenant
 * @param {string} tenantId - Tenant identifier
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} Array of mailboxes
 */
export async function listMailboxes(tenantId, status = null) {
  try {
    const db = getDb();
    let query = db
      .collection('tenants')
      .doc(tenantId)
      .collection('mailboxes');

    if (status) {
      query = query.where('status', '==', status);
    }

    const mailboxesSnapshot = await query.orderBy('createdAt', 'desc').get();

    const mailboxes = [];
    mailboxesSnapshot.forEach(doc => {
      mailboxes.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return mailboxes;
  } catch (error) {
    console.error('Error listing mailboxes:', error);
    throw error;
  }
}

/**
 * Get all active mailboxes across all tenants
 * @returns {Promise<Array>} Array of active mailboxes with tenant info
 */
export async function getAllActiveMailboxes() {
  try {
    const db = getDb();
    
    // Get all tenants
    const tenantsSnapshot = await db.collection('tenants')
      .where('status', '==', 'active')
      .get();

    const activeMailboxes = [];

    // For each tenant, get active mailboxes
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const mailboxesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('mailboxes')
        .where('status', '==', 'active')
        .get();

      mailboxesSnapshot.forEach(mailboxDoc => {
        activeMailboxes.push({
          tenantId,
          mailboxId: mailboxDoc.id,
          ...mailboxDoc.data(),
        });
      });
    }

    return activeMailboxes;
  } catch (error) {
    console.error('Error getting all active mailboxes:', error);
    throw error;
  }
}
