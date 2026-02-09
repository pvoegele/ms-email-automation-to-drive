import admin from 'firebase-admin';
import { getDb } from './firebase.js';

/**
 * Microsoft Connection Service
 * Manages Microsoft OAuth connections for tenants
 */

/**
 * Create or update Microsoft connection
 * @param {string} tenantId - Tenant identifier
 * @param {string} connectionId - Connection identifier
 * @param {object} connectionData - Connection data
 * @returns {Promise<void>}
 */
export async function createMsConnection(tenantId, connectionId, connectionData) {
  try {
    const db = getDb();
    const connectionRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('msConnections')
      .doc(connectionId);

    await connectionRef.set({
      msTenantId: connectionData.msTenantId,
      scopesGranted: connectionData.scopesGranted || [],
      status: connectionData.status || 'active',
      tokenRef: connectionData.tokenRef, // Reference to Secret Manager
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`MS Connection created: ${connectionId} for tenant: ${tenantId}`);
  } catch (error) {
    console.error('Error creating MS connection:', error);
    throw error;
  }
}

/**
 * Get Microsoft connection
 * @param {string} tenantId - Tenant identifier
 * @param {string} connectionId - Connection identifier
 * @returns {Promise<object|null>} Connection object or null
 */
export async function getMsConnection(tenantId, connectionId) {
  try {
    const db = getDb();
    const connectionDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('msConnections')
      .doc(connectionId)
      .get();

    if (!connectionDoc.exists) {
      return null;
    }

    return {
      id: connectionDoc.id,
      ...connectionDoc.data(),
    };
  } catch (error) {
    console.error('Error getting MS connection:', error);
    throw error;
  }
}

/**
 * Update Microsoft connection
 * @param {string} tenantId - Tenant identifier
 * @param {string} connectionId - Connection identifier
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateMsConnection(tenantId, connectionId, updates) {
  try {
    const db = getDb();
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('msConnections')
      .doc(connectionId)
      .update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`MS Connection updated: ${connectionId}`);
  } catch (error) {
    console.error('Error updating MS connection:', error);
    throw error;
  }
}

/**
 * List Microsoft connections for a tenant
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Array>} Array of connections
 */
export async function listMsConnections(tenantId) {
  try {
    const db = getDb();
    const connectionsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('msConnections')
      .orderBy('createdAt', 'desc')
      .get();

    const connections = [];
    connectionsSnapshot.forEach(doc => {
      connections.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return connections;
  } catch (error) {
    console.error('Error listing MS connections:', error);
    throw error;
  }
}

/**
 * Get active Microsoft connection for a tenant
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<object|null>} Active connection or null
 */
export async function getActiveMsConnection(tenantId) {
  try {
    const db = getDb();
    const connectionsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('msConnections')
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (connectionsSnapshot.empty) {
      return null;
    }

    const doc = connectionsSnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error('Error getting active MS connection:', error);
    throw error;
  }
}
