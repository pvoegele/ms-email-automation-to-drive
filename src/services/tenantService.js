import admin from 'firebase-admin';
import { getDb } from './firebase.js';

/**
 * Tenant Service
 * Manages multi-tenant data model for MVP Backend
 */

/**
 * Create a new tenant
 * @param {string} tenantId - Tenant identifier
 * @param {object} tenantData - Tenant data
 * @returns {Promise<void>}
 */
export async function createTenant(tenantId, tenantData) {
  try {
    const db = getDb();
    await db.collection('tenants').doc(tenantId).set({
      name: tenantData.name,
      plan: tenantData.plan || 'base',
      status: tenantData.status || 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Tenant created: ${tenantId}`);
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
}

/**
 * Get tenant by ID
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<object|null>} Tenant object or null
 */
export async function getTenant(tenantId) {
  try {
    const db = getDb();
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();

    if (!tenantDoc.exists) {
      return null;
    }

    return {
      id: tenantDoc.id,
      ...tenantDoc.data(),
    };
  } catch (error) {
    console.error('Error getting tenant:', error);
    throw error;
  }
}

/**
 * Update tenant
 * @param {string} tenantId - Tenant identifier
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateTenant(tenantId, updates) {
  try {
    const db = getDb();
    await db.collection('tenants').doc(tenantId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Tenant updated: ${tenantId}`);
  } catch (error) {
    console.error('Error updating tenant:', error);
    throw error;
  }
}

/**
 * List all tenants
 * @returns {Promise<Array>} Array of tenants
 */
export async function listTenants() {
  try {
    const db = getDb();
    const tenantsSnapshot = await db.collection('tenants')
      .orderBy('createdAt', 'desc')
      .get();

    const tenants = [];
    tenantsSnapshot.forEach(doc => {
      tenants.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return tenants;
  } catch (error) {
    console.error('Error listing tenants:', error);
    throw error;
  }
}
