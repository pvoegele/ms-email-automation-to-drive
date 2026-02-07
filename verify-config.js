#!/usr/bin/env node

/**
 * Configuration Verification Script
 * Tests environment configuration without running the server
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verifying Configuration...\n');

// Load environment variables
dotenv.config();

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function checkPass(message) {
  console.log('✅', message);
  checks.passed++;
}

function checkFail(message) {
  console.log('❌', message);
  checks.failed++;
}

function checkWarn(message) {
  console.log('⚠️ ', message);
  checks.warnings++;
}

// Check required environment variables
console.log('📋 Environment Variables:');

const required = {
  'CLIENT_ID': 'Microsoft Azure Client ID',
  'CLIENT_SECRET': 'Microsoft Azure Client Secret',
  'REDIRECT_URI': 'OAuth Redirect URI',
  'FIREBASE_PROJECT_ID': 'Firebase Project ID',
  'FIREBASE_CLIENT_EMAIL': 'Firebase Client Email',
  'FIREBASE_PRIVATE_KEY': 'Firebase Private Key',
};

for (const [key, description] of Object.entries(required)) {
  if (process.env[key]) {
    checkPass(`${description} is set`);
  } else {
    checkFail(`${description} is missing (${key})`);
  }
}

const optional = {
  'TENANT_ID': 'Azure Tenant ID (defaults to "common")',
  'PORT': 'Server Port (defaults to 3000)',
  'NODE_ENV': 'Node Environment (defaults to "development")',
  'FRONTEND_URL': 'Frontend URL (defaults to http://localhost:5173)',
  'LOG_LEVEL': 'Log Level (defaults to "info")',
};

console.log('\n📋 Optional Environment Variables:');

for (const [key, description] of Object.entries(optional)) {
  if (process.env[key]) {
    checkPass(`${description} is set`);
  } else {
    checkWarn(`${description} not set, using default`);
  }
}

// Check Node.js version
console.log('\n🔧 Node.js Environment:');

const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion >= 16) {
  checkPass(`Node.js version ${nodeVersion} (>= 16.0.0)`);
} else {
  checkFail(`Node.js version ${nodeVersion} (requires >= 16.0.0)`);
}

// Summary
console.log('\n📊 Summary:');
console.log(`   ✅ Passed: ${checks.passed}`);
if (checks.warnings > 0) {
  console.log(`   ⚠️  Warnings: ${checks.warnings}`);
}
if (checks.failed > 0) {
  console.log(`   ❌ Failed: ${checks.failed}`);
}

console.log('\n');

if (checks.failed === 0) {
  console.log('🎉 Configuration is valid! You can start the server with:');
  console.log('   npm start     (production)');
  console.log('   npm run dev   (development)\n');
  process.exit(0);
} else {
  console.log('❗ Configuration has errors. Please check the following:');
  console.log('   1. Copy .env.example to .env');
  console.log('   2. Fill in all required values in .env');
  console.log('   3. See SETUP.md for detailed setup instructions\n');
  process.exit(1);
}
