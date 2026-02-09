import admin from 'firebase-admin';
import { getDb } from './firebase.js';

/**
 * Usage Events Service
 * Tracks usage events for billing purposes
 */

/**
 * Create usage event
 * @param {string} tenantId - Tenant identifier
 * @param {object} eventData - Event data
 * @returns {Promise<string>} Event ID
 */
export async function createUsageEvent(tenantId, eventData) {
  try {
    const db = getDb();
    const eventRef = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('usageEvents')
      .add({
        service: eventData.service || 'mail_archive',
        metric: eventData.metric || 'attachment_stored',
        quantity: eventData.quantity || 1,
        sourceId: eventData.sourceId, // messageId_attachmentId
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: eventData.metadata || {},
      });

    console.log(`Usage event created: ${eventRef.id} for tenant: ${tenantId}`);
    return eventRef.id;
  } catch (error) {
    console.error('Error creating usage event:', error);
    throw error;
  }
}

/**
 * Check if usage event exists by sourceId (for deduplication)
 * @param {string} tenantId - Tenant identifier
 * @param {string} sourceId - Source identifier (messageId_attachmentId)
 * @returns {Promise<boolean>} True if event exists
 */
export async function usageEventExists(tenantId, sourceId) {
  try {
    const db = getDb();
    const eventsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('usageEvents')
      .where('sourceId', '==', sourceId)
      .limit(1)
      .get();

    return !eventsSnapshot.empty;
  } catch (error) {
    console.error('Error checking usage event:', error);
    throw error;
  }
}

/**
 * Get usage events for a tenant
 * @param {string} tenantId - Tenant identifier
 * @param {object} options - Query options
 * @returns {Promise<Array>} Array of usage events
 */
export async function getUsageEvents(tenantId, options = {}) {
  try {
    const db = getDb();
    const {
      limit = 100,
      startDate = null,
      endDate = null,
      service = null,
    } = options;

    let query = db
      .collection('tenants')
      .doc(tenantId)
      .collection('usageEvents');

    if (service) {
      query = query.where('service', '==', service);
    }

    if (startDate) {
      query = query.where('timestamp', '>=', new Date(startDate));
    }

    if (endDate) {
      query = query.where('timestamp', '<=', new Date(endDate));
    }

    const eventsSnapshot = await query
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const events = [];
    eventsSnapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return events;
  } catch (error) {
    console.error('Error getting usage events:', error);
    throw error;
  }
}

/**
 * Get usage statistics for a tenant
 * @param {string} tenantId - Tenant identifier
 * @param {object} options - Query options
 * @returns {Promise<object>} Usage statistics
 */
export async function getUsageStatistics(tenantId, options = {}) {
  try {
    const db = getDb();
    const {
      startDate = null,
      endDate = null,
      service = null,
    } = options;

    let query = db
      .collection('tenants')
      .doc(tenantId)
      .collection('usageEvents');

    if (service) {
      query = query.where('service', '==', service);
    }

    if (startDate) {
      query = query.where('timestamp', '>=', new Date(startDate));
    }

    if (endDate) {
      query = query.where('timestamp', '<=', new Date(endDate));
    }

    const eventsSnapshot = await query.get();

    let totalEvents = 0;
    let totalQuantity = 0;
    const metricCounts = {};

    eventsSnapshot.forEach(doc => {
      const data = doc.data();
      totalEvents++;
      totalQuantity += data.quantity || 0;
      
      const metric = data.metric || 'unknown';
      metricCounts[metric] = (metricCounts[metric] || 0) + (data.quantity || 0);
    });

    return {
      totalEvents,
      totalQuantity,
      metricCounts,
      period: {
        startDate,
        endDate,
      },
    };
  } catch (error) {
    console.error('Error getting usage statistics:', error);
    throw error;
  }
}
