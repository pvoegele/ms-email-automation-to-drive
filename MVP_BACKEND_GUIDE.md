# MVP Backend Implementation Guide – Microsoft Mail → SharePoint Storage

This document describes the MVP Backend implementation for automated Microsoft 365 email attachment archival to SharePoint/OneDrive.

## Overview

The MVP Backend provides:
- **Multi-tenant support** with proper isolation
- **Secure OAuth flow** with PKCE (Proof Key for Code Exchange)
- **Automatic mailbox polling** for new emails with attachments
- **Attachment deduplication** using SHA-256 hashing
- **SharePoint upload** with organized folder structure
- **Usage tracking** for future billing integration

## Architecture

```
Tenant
 └─ Microsoft Connection (OAuth Consent)
     └─ Mailbox (Email polling)
         └─ Messages (Filtered by attachments)
             └─ Attachments (Deduplicated)
                 └─ SharePoint Upload
                     └─ Usage Event (Billing)
```

## Data Model (Firestore)

### Tenants Collection

**Path:** `tenants/{tenantId}`

```json
{
  "name": "Customer A",
  "plan": "base",
  "status": "active",
  "createdAt": "timestamp"
}
```

### Microsoft Connections Subcollection

**Path:** `tenants/{tenantId}/msConnections/{connectionId}`

```json
{
  "msTenantId": "azure-tenant-id",
  "scopesGranted": ["Mail.Read", "Files.ReadWrite.All"],
  "status": "active | revoked | needs_reconsent",
  "tokenRef": "secret://encrypted-token-reference",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Mailboxes Subcollection

**Path:** `tenants/{tenantId}/mailboxes/{mailboxId}`

```json
{
  "connectionId": "connection-id",
  "mailboxAddress": "inbox@company.com",
  "lastCursor": "2026-02-09T08:00:00Z",
  "status": "active | paused",
  "createdAt": "timestamp"
}
```

### Usage Events Subcollection

**Path:** `tenants/{tenantId}/usageEvents/{eventId}`

```json
{
  "service": "mail_archive",
  "metric": "attachment_stored",
  "quantity": 1,
  "sourceId": "messageId_attachmentId",
  "timestamp": "timestamp",
  "metadata": {
    "messageId": "msg-id",
    "attachmentId": "attach-id",
    "fileName": "document.pdf",
    "fileSize": 102400,
    "hash": "sha256-hash",
    "uploadPath": "/Shared Documents/MailArchive/2026/02/document.pdf"
  }
}
```

## API Endpoints

### OAuth / Connection Management

#### Start Microsoft OAuth Flow

```http
GET /connect/microsoft/start?tenantId={tenantId}
```

**Response:**
```json
{
  "authUrl": "https://login.microsoftonline.com/...",
  "state": "base64-encoded-state",
  "message": "Please navigate to this URL to sign in with Microsoft"
}
```

Features:
- PKCE code challenge generation
- State parameter with CSRF protection
- Temporary storage of PKCE verifier

#### OAuth Callback

```http
GET /connect/microsoft/callback?code={code}&state={state}
```

Handles:
- State validation
- PKCE verification
- Token exchange
- Secure token storage in Secret Manager
- Connection metadata storage

#### Check Connection Status

```http
GET /connect/microsoft/status/:tenantId/:connectionId
```

**Response:**
```json
{
  "connected": true,
  "status": "active",
  "msTenantId": "azure-tenant-id",
  "scopesGranted": ["Mail.Read", "Files.ReadWrite.All"],
  "createdAt": "timestamp"
}
```

#### Revoke Connection

```http
POST /connect/microsoft/revoke/:tenantId/:connectionId
```

### Tenant Management

#### Create Tenant

```http
POST /api/tenants
Content-Type: application/json

{
  "tenantId": "tenant-123",
  "name": "Customer A",
  "plan": "base"
}
```

#### List Tenants

```http
GET /api/tenants
```

#### Get Tenant Details

```http
GET /api/tenants/:tenantId
```

### Mailbox Management

#### Create Mailbox

```http
POST /api/tenants/:tenantId/mailboxes
Content-Type: application/json

{
  "mailboxId": "mailbox-123",
  "connectionId": "connection-id",
  "mailboxAddress": "inbox@company.com"
}
```

#### List Mailboxes

```http
GET /api/tenants/:tenantId/mailboxes?status=active
```

#### Update Mailbox

```http
PUT /api/tenants/:tenantId/mailboxes/:mailboxId
Content-Type: application/json

{
  "status": "paused"
}
```

### Usage Tracking

#### Get Usage Events

```http
GET /api/tenants/:tenantId/usage?limit=100&startDate=2026-02-01&endDate=2026-02-28
```

#### Get Usage Statistics

```http
GET /api/tenants/:tenantId/usage/stats?service=mail_archive
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalEvents": 150,
    "totalQuantity": 150,
    "metricCounts": {
      "attachment_stored": 150
    },
    "period": {
      "startDate": "2026-02-01",
      "endDate": "2026-02-28"
    }
  }
}
```

## Mailbox Polling Service

The polling service automatically:
1. Fetches all active mailboxes across all tenants
2. For each mailbox:
   - Retrieves messages with attachments
   - Filters by `receivedDateTime > lastCursor`
   - Downloads attachments
   - Checks for duplicates using `sourceId` (messageId_attachmentId)
   - Calculates SHA-256 hash
   - Uploads to SharePoint
   - Creates usage event
   - Updates cursor

### Configuration

Environment variables:
```env
POLLING_ENABLED=true
POLLING_INTERVAL_MINUTES=5
```

### SharePoint Upload Path

Fixed structure for MVP:
```
/Shared Documents/MailArchive/{YYYY}/{MM}/{filename}
```

Example:
```
/Shared Documents/MailArchive/2026/02/invoice_2026.pdf
```

## Security Features

### PKCE (Proof Key for Code Exchange)

- Code verifier: Random 32-byte value, base64url encoded
- Code challenge: SHA-256 hash of verifier, base64url encoded
- Protects against authorization code interception attacks

### Token Security

Tokens are **never stored in plaintext** in Firestore:
- Encrypted using AES-256-GCM
- Stored references: `secret://base64-encrypted-data`
- In production: Should use Google Secret Manager or similar

### State Parameter

- Includes CSRF protection
- Contains tenant and connection metadata
- Has expiration (10 minutes)
- Validated on callback

## Setup and Configuration

### 1. Environment Variables

Create `.env` file:

```env
# Microsoft Azure AD
CLIENT_ID=your_azure_client_id
CLIENT_SECRET=your_azure_client_secret
TENANT_ID=common
REDIRECT_URI=http://localhost:3000/connect/microsoft/callback

# Firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Secret Manager (32-byte key in hex format)
TOKEN_ENCRYPTION_KEY=your_32_byte_encryption_key_in_hex

# App Config
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Mailbox Polling
POLLING_ENABLED=true
POLLING_INTERVAL_MINUTES=5

# Optional
LOG_LEVEL=info
```

### 2. Azure AD Configuration

Required Microsoft Graph API permissions:
- `User.Read` - Read user profile
- `Mail.Read` - Read emails
- `Files.ReadWrite.All` - Access to OneDrive/SharePoint
- `offline_access` - Refresh token support

Update redirect URI in Azure AD:
```
http://localhost:3000/connect/microsoft/callback
```

### 3. Firestore Setup

Enable Firestore in your Firebase project:
1. Go to Firebase Console
2. Select your project
3. Navigate to Firestore Database
4. Click "Create database"
5. Choose production mode
6. Select a region

Create indexes (if needed):
- Collection: `tenants/{tenantId}/usageEvents`
  - Fields: `sourceId` (Ascending), `timestamp` (Descending)

### 4. Generate Encryption Key

For TOKEN_ENCRYPTION_KEY:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Running the Application

### Start Server

```bash
npm install
npm start
```

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

## Usage Flow

### 1. Create Tenant

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "name": "My Company",
    "plan": "base"
  }'
```

### 2. Start OAuth Flow

```bash
curl http://localhost:3000/connect/microsoft/start?tenantId=tenant-123
```

Response includes `authUrl` - navigate user to this URL

### 3. User Completes OAuth

User signs in with Microsoft, grants permissions, and is redirected to callback

### 4. Create Mailbox

```bash
curl -X POST http://localhost:3000/api/tenants/tenant-123/mailboxes \
  -H "Content-Type: application/json" \
  -d '{
    "mailboxId": "mailbox-1",
    "connectionId": "{connectionId from OAuth}",
    "mailboxAddress": "user@company.com"
  }'
```

### 5. Polling Starts Automatically

The polling service will:
- Check mailbox every 5 minutes (configurable)
- Process emails with attachments
- Upload to SharePoint
- Track usage events

### 6. View Usage

```bash
curl http://localhost:3000/api/tenants/tenant-123/usage/stats
```

## Monitoring and Logging

### Log Levels

- `ERROR`: Critical errors requiring attention
- `WARN`: Warnings about potential issues
- `INFO`: General information about operations

### Key Log Messages

- `Mailbox polling started with X minute interval` - Polling service started
- `Poll cycle completed in Xms: Y emails, Z attachments` - Polling cycle summary
- `Tokens stored securely for user: X` - Token storage
- `File uploaded to SharePoint: /path/to/file` - Successful upload
- `Attachment already processed: messageId_attachmentId` - Deduplication working

## Troubleshooting

### Polling Not Working

1. Check `POLLING_ENABLED=true` in `.env`
2. Verify active mailboxes exist
3. Check connection status is `active`
4. Review token expiration

### Token Errors

1. Ensure `TOKEN_ENCRYPTION_KEY` is set
2. Check token hasn't expired
3. Verify connection hasn't been revoked
4. Re-authenticate if needed

### Upload Failures

1. Verify SharePoint permissions
2. Check file size limits
3. Ensure folder structure can be created
4. Review network connectivity

## Next Steps (Out of MVP Scope)

- [ ] Webhook support instead of polling
- [ ] AI/OCR for document extraction
- [ ] Rule engine for advanced filtering
- [ ] Billing integration with Stripe
- [ ] Frontend dashboard
- [ ] Advanced reporting
- [ ] Multi-region support
- [ ] Enhanced deduplication strategies

## Security Considerations

1. **Never commit secrets** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate encryption keys** periodically in production
4. **Monitor usage events** for unusual patterns
5. **Implement rate limiting** for API endpoints
6. **Use HTTPS** in production
7. **Regular security audits** of dependencies

## Support

For issues and questions:
- Check the logs first
- Review this documentation
- Check existing GitHub issues
- Create a new issue with detailed information
