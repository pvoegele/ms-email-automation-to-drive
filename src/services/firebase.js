import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initialize Firebase Admin SDK
 */
let db = null;

export function initializeFirebase() {
  if (!admin.apps.length) {
    try {
      // Initialize with environment variables
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });

      db = admin.firestore();
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  } else {
    db = admin.firestore();
  }

  return db;
}

/**
 * Get Firestore database instance
 * @returns {object} Firestore database
 */
export function getDb() {
  if (!db) {
    return initializeFirebase();
  }
  return db;
}

// User Token Management

/**
 * Store user tokens in Firestore
 * @param {string} userId - User identifier
 * @param {object} tokens - Token object with accessToken, refreshToken, expiresOn
 * @returns {Promise<void>}
 */
export async function storeUserTokens(userId, tokens) {
  try {
    const db = getDb();
    await db.collection('users').doc(userId).set({
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresOn: tokens.expiresOn,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`Tokens stored for user: ${userId}`);
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  }
}

/**
 * Get user tokens from Firestore
 * @param {string} userId - User identifier
 * @returns {Promise<object|null>} Token object or null
 */
export async function getUserTokens(userId) {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data().tokens;
  } catch (error) {
    console.error('Error getting tokens:', error);
    throw error;
  }
}

/**
 * Delete user tokens from Firestore
 * @param {string} userId - User identifier
 * @returns {Promise<void>}
 */
export async function deleteUserTokens(userId) {
  try {
    const db = getDb();
    await db.collection('users').doc(userId).delete();
    console.log(`Tokens deleted for user: ${userId}`);
  } catch (error) {
    console.error('Error deleting tokens:', error);
    throw error;
  }
}

// Automation Rules Management

/**
 * Create automation rule
 * @param {string} userId - User identifier
 * @param {object} ruleData - Rule configuration
 * @returns {Promise<string>} Rule ID
 */
export async function createAutomationRule(userId, ruleData) {
  try {
    const db = getDb();
    const ruleRef = await db.collection('automationRules').add({
      userId,
      name: ruleData.name,
      sourceFolder: ruleData.sourceFolder || 'inbox',
      targetFolder: ruleData.targetFolder,
      filters: ruleData.filters || {},
      schedule: ruleData.schedule || 'manual',
      enabled: ruleData.enabled !== false,
      stats: {
        totalProcessed: 0,
        totalAttachments: 0,
        errors: 0,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRun: null,
    });

    console.log(`Rule created with ID: ${ruleRef.id}`);
    return ruleRef.id;
  } catch (error) {
    console.error('Error creating rule:', error);
    throw error;
  }
}

/**
 * Get all automation rules for a user
 * @param {string} userId - User identifier
 * @returns {Promise<Array>} Array of rules
 */
export async function getAutomationRules(userId) {
  try {
    const db = getDb();
    const rulesSnapshot = await db.collection('automationRules')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const rules = [];
    rulesSnapshot.forEach(doc => {
      rules.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return rules;
  } catch (error) {
    console.error('Error getting rules:', error);
    throw error;
  }
}

/**
 * Get single automation rule
 * @param {string} ruleId - Rule identifier
 * @returns {Promise<object|null>} Rule object or null
 */
export async function getAutomationRule(ruleId) {
  try {
    const db = getDb();
    const ruleDoc = await db.collection('automationRules').doc(ruleId).get();

    if (!ruleDoc.exists) {
      return null;
    }

    return {
      id: ruleDoc.id,
      ...ruleDoc.data(),
    };
  } catch (error) {
    console.error('Error getting rule:', error);
    throw error;
  }
}

/**
 * Update automation rule
 * @param {string} ruleId - Rule identifier
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateAutomationRule(ruleId, updates) {
  try {
    const db = getDb();
    await db.collection('automationRules').doc(ruleId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Rule updated: ${ruleId}`);
  } catch (error) {
    console.error('Error updating rule:', error);
    throw error;
  }
}

/**
 * Delete automation rule
 * @param {string} ruleId - Rule identifier
 * @returns {Promise<void>}
 */
export async function deleteAutomationRule(ruleId) {
  try {
    const db = getDb();
    await db.collection('automationRules').doc(ruleId).delete();
    console.log(`Rule deleted: ${ruleId}`);
  } catch (error) {
    console.error('Error deleting rule:', error);
    throw error;
  }
}

/**
 * Update rule statistics
 * @param {string} ruleId - Rule identifier
 * @param {object} stats - Statistics to update
 * @returns {Promise<void>}
 */
export async function updateRuleStats(ruleId, stats) {
  try {
    const db = getDb();
    const ruleRef = db.collection('automationRules').doc(ruleId);
    
    await ruleRef.update({
      'stats.totalProcessed': admin.firestore.FieldValue.increment(stats.emailsProcessed || 0),
      'stats.totalAttachments': admin.firestore.FieldValue.increment(stats.attachmentsSaved || 0),
      'stats.errors': admin.firestore.FieldValue.increment(stats.errors || 0),
      lastRun: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating rule stats:', error);
    throw error;
  }
}

// Process Logs

/**
 * Create process log entry
 * @param {object} logData - Log data
 * @returns {Promise<string>} Log ID
 */
export async function createProcessLog(logData) {
  try {
    const db = getDb();
    const logRef = await db.collection('processLogs').add({
      userId: logData.userId,
      ruleId: logData.ruleId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      emailsProcessed: logData.emailsProcessed || 0,
      attachmentsSaved: logData.attachmentsSaved || 0,
      errors: logData.errors || [],
      success: logData.success !== false,
    });

    return logRef.id;
  } catch (error) {
    console.error('Error creating process log:', error);
    throw error;
  }
}

/**
 * Get process logs for a user
 * @param {string} userId - User identifier
 * @param {number} limit - Number of logs to retrieve
 * @returns {Promise<Array>} Array of logs
 */
export async function getProcessLogs(userId, limit = 50) {
  try {
    const db = getDb();
    const logsSnapshot = await db.collection('processLogs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const logs = [];
    logsSnapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return logs;
  } catch (error) {
    console.error('Error getting process logs:', error);
    throw error;
  }
}
