# API Documentation

Complete API reference for the Email to OneDrive Automation system.

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

All endpoints (except `/health`, `/`, and auth endpoints) require user authentication. The system uses Microsoft OAuth 2.0 with token-based authentication stored in Firebase.

### Authentication Flow

1. Get sign-in URL from `/api/auth/signin`
2. Redirect user to Microsoft login
3. User grants permissions
4. Microsoft redirects to `/api/auth/callback`
5. Backend stores tokens in Firebase
6. User can now make authenticated requests

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional details",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Authentication Endpoints

#### Get Sign-In URL
Get Microsoft OAuth authorization URL to initiate authentication.

**Endpoint:** `GET /api/auth/signin`

**Query Parameters:**
- `userId` (required): Unique user identifier

**Example:**
```bash
curl "http://localhost:3000/api/auth/signin?userId=user123"
```

**Response:**
```json
{
  "authUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...",
  "message": "Please navigate to this URL to sign in"
}
```

---

#### OAuth Callback
Handles the OAuth callback from Microsoft. Do not call directly.

**Endpoint:** `GET /api/auth/callback`

**Query Parameters:**
- `code`: Authorization code from Microsoft
- `state`: User ID passed from sign-in
- `error`: Error code (if authentication failed)
- `error_description`: Error description

**Behavior:**
- On success: Redirects to `{FRONTEND_URL}/auth/success?userId={userId}`
- On error: Redirects to `{FRONTEND_URL}/auth/error?error={error}`

---

#### Check Authentication Status
Check if a user is authenticated and token validity.

**Endpoint:** `GET /api/auth/status/:userId`

**Path Parameters:**
- `userId`: User identifier

**Example:**
```bash
curl "http://localhost:3000/api/auth/status/user123"
```

**Response:**
```json
{
  "authenticated": true,
  "expiresOn": "2024-01-01T12:00:00.000Z",
  "expired": false,
  "message": "User authenticated"
}
```

---

#### Sign Out
Remove user tokens and sign out.

**Endpoint:** `POST /api/auth/signout/:userId`

**Path Parameters:**
- `userId`: User identifier

**Example:**
```bash
curl -X POST "http://localhost:3000/api/auth/signout/user123"
```

**Response:**
```json
{
  "success": true,
  "message": "User signed out successfully"
}
```

---

### Email Endpoints

#### List Emails
Retrieve emails from user's mailbox with optional filters.

**Endpoint:** `GET /api/emails/:userId`

**Path Parameters:**
- `userId`: User identifier

**Query Parameters:**
- `folder` (optional, default: "inbox"): Mail folder name
- `top` (optional, default: 50): Number of emails to return (max 100)
- `skip` (optional, default: 0): Number of emails to skip (pagination)
- `filter` (optional): OData filter query
- `orderBy` (optional, default: "receivedDateTime DESC"): Sort order

**Examples:**
```bash
# Get inbox emails
curl "http://localhost:3000/api/emails/user123?folder=inbox&top=20"

# Get emails with attachments
curl "http://localhost:3000/api/emails/user123?filter=hasAttachments eq true"

# Get unread emails
curl "http://localhost:3000/api/emails/user123?filter=isRead eq false"
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "emails": [
    {
      "id": "AAMkAGI...",
      "subject": "Invoice for January",
      "from": {
        "emailAddress": {
          "name": "John Doe",
          "address": "john@example.com"
        }
      },
      "receivedDateTime": "2024-01-15T10:30:00Z",
      "hasAttachments": true,
      "isRead": false,
      "bodyPreview": "Please find attached..."
    }
  ]
}
```

---

#### Get Email Details
Get detailed information about a specific email.

**Endpoint:** `GET /api/emails/:userId/:messageId`

**Path Parameters:**
- `userId`: User identifier
- `messageId`: Email message ID

**Example:**
```bash
curl "http://localhost:3000/api/emails/user123/AAMkAGI..."
```

**Response:**
```json
{
  "success": true,
  "email": {
    "id": "AAMkAGI...",
    "subject": "Invoice for January",
    "from": { ... },
    "receivedDateTime": "2024-01-15T10:30:00Z",
    "body": {
      "contentType": "html",
      "content": "<html>...</html>"
    },
    "toRecipients": [...],
    "ccRecipients": [...]
  }
}
```

---

#### Get Email Attachments
List all attachments for a specific email.

**Endpoint:** `GET /api/emails/:userId/:messageId/attachments`

**Path Parameters:**
- `userId`: User identifier
- `messageId`: Email message ID

**Example:**
```bash
curl "http://localhost:3000/api/emails/user123/AAMkAGI.../attachments"
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "attachments": [
    {
      "id": "AAMkAGI...",
      "name": "invoice.pdf",
      "contentType": "application/pdf",
      "size": 245678
    },
    {
      "id": "AAMkAGI...",
      "name": "receipt.xlsx",
      "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "size": 15234
    }
  ]
}
```

---

### OneDrive Endpoints

#### List OneDrive Folders
List items (folders and files) in a OneDrive folder.

**Endpoint:** `GET /api/onedrive/:userId/folders`

**Path Parameters:**
- `userId`: User identifier

**Query Parameters:**
- `path` (optional, default: "/"): Folder path to list

**Examples:**
```bash
# List root folder
curl "http://localhost:3000/api/onedrive/user123/folders"

# List specific folder
curl "http://localhost:3000/api/onedrive/user123/folders?path=/Documents"
```

**Response:**
```json
{
  "success": true,
  "path": "/",
  "count": 5,
  "items": [
    {
      "id": "01BYE5RZ...",
      "name": "Documents",
      "folder": {
        "childCount": 12
      },
      "size": 0,
      "lastModifiedDateTime": "2024-01-15T10:30:00Z"
    },
    {
      "id": "01BYE5RZ...",
      "name": "report.pdf",
      "file": {
        "mimeType": "application/pdf"
      },
      "size": 125678,
      "lastModifiedDateTime": "2024-01-15T09:00:00Z"
    }
  ]
}
```

---

#### Create OneDrive Folder
Create a new folder in OneDrive.

**Endpoint:** `POST /api/onedrive/:userId/folders`

**Path Parameters:**
- `userId`: User identifier

**Request Body:**
```json
{
  "folderName": "EmailAttachments",
  "parentPath": "/"
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/onedrive/user123/folders" \
  -H "Content-Type: application/json" \
  -d '{"folderName": "Invoices", "parentPath": "/Documents"}'
```

**Response:**
```json
{
  "success": true,
  "folder": {
    "id": "01BYE5RZ...",
    "name": "Invoices",
    "folder": {
      "childCount": 0
    }
  }
}
```

---

#### Upload File to OneDrive
Upload a file to OneDrive. Automatically uses chunked upload for files > 4MB.

**Endpoint:** `POST /api/onedrive/:userId/upload`

**Path Parameters:**
- `userId`: User identifier

**Request Body:**
```json
{
  "fileName": "document.pdf",
  "fileContent": "base64_encoded_file_content",
  "folderPath": "/EmailAttachments"
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/onedrive/user123/upload" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "invoice.pdf",
    "fileContent": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC...",
    "folderPath": "/Invoices"
  }'
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "01BYE5RZ...",
    "name": "invoice.pdf",
    "size": 245678,
    "webUrl": "https://..."
  }
}
```

---

### Automation Rules Endpoints

#### List Automation Rules
Get all automation rules for a user.

**Endpoint:** `GET /api/rules/:userId`

**Path Parameters:**
- `userId`: User identifier

**Example:**
```bash
curl "http://localhost:3000/api/rules/user123"
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "rules": [
    {
      "id": "rule123",
      "userId": "user123",
      "name": "Save Invoice Attachments",
      "sourceFolder": "inbox",
      "targetFolder": "/Invoices/{year}/{month}",
      "filters": {
        "senderEmail": "invoices@example.com",
        "hasAttachments": true,
        "attachmentExtensions": ["pdf", "xlsx"]
      },
      "schedule": "manual",
      "enabled": true,
      "stats": {
        "totalProcessed": 45,
        "totalAttachments": 67,
        "errors": 2
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastRun": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

#### Get Single Rule
Get details of a specific automation rule.

**Endpoint:** `GET /api/rules/:userId/:ruleId`

**Path Parameters:**
- `userId`: User identifier
- `ruleId`: Rule identifier

**Example:**
```bash
curl "http://localhost:3000/api/rules/user123/rule123"
```

---

#### Create Automation Rule
Create a new automation rule.

**Endpoint:** `POST /api/rules/:userId`

**Path Parameters:**
- `userId`: User identifier

**Request Body:**
```json
{
  "name": "Save Invoice Attachments",
  "sourceFolder": "inbox",
  "targetFolder": "/Invoices/{year}/{month}",
  "filters": {
    "senderEmail": "invoices@example.com",
    "subject": "Invoice",
    "hasAttachments": true,
    "attachmentExtensions": ["pdf", "xlsx"],
    "maxFileSize": 10485760,
    "dateFrom": "2024-01-01T00:00:00Z"
  },
  "schedule": "manual",
  "enabled": true,
  "markAsRead": false
}
```

**Filter Options:**
- `senderEmail`: Filter by sender email address
- `subject`: Filter by subject keyword (contains)
- `hasAttachments`: Require attachments (boolean)
- `attachmentExtensions`: Array of allowed file extensions
- `maxFileSize`: Maximum file size in bytes
- `minFileSize`: Minimum file size in bytes
- `dateFrom`: Start date (ISO 8601)
- `dateTo`: End date (ISO 8601)

**Schedule Options:**
- `"manual"`: Execute only when triggered manually
- `{ "type": "interval", "intervalMinutes": 15 }`: Execute every N minutes

**Target Folder Variables:**
- `{sender}`: Email sender name
- `{date}`: Full date (YYYY-MM-DD)
- `{year}`: Year (YYYY)
- `{month}`: Month (MM)

**Example:**
```bash
curl -X POST "http://localhost:3000/api/rules/user123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Save Reports",
    "sourceFolder": "inbox",
    "targetFolder": "/Reports/{year}",
    "filters": {
      "subject": "Monthly Report",
      "attachmentExtensions": ["pdf"]
    },
    "schedule": "manual",
    "enabled": true
  }'
```

**Response:**
```json
{
  "success": true,
  "ruleId": "rule456",
  "message": "Rule created successfully"
}
```

---

#### Update Automation Rule
Update an existing automation rule.

**Endpoint:** `PUT /api/rules/:userId/:ruleId`

**Path Parameters:**
- `userId`: User identifier
- `ruleId`: Rule identifier

**Request Body:**
```json
{
  "name": "Updated Rule Name",
  "enabled": false,
  "targetFolder": "/NewFolder"
}
```

**Example:**
```bash
curl -X PUT "http://localhost:3000/api/rules/user123/rule456" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

**Response:**
```json
{
  "success": true,
  "message": "Rule updated successfully"
}
```

---

#### Delete Automation Rule
Delete an automation rule.

**Endpoint:** `DELETE /api/rules/:userId/:ruleId`

**Path Parameters:**
- `userId`: User identifier
- `ruleId`: Rule identifier

**Example:**
```bash
curl -X DELETE "http://localhost:3000/api/rules/user123/rule456"
```

**Response:**
```json
{
  "success": true,
  "message": "Rule deleted successfully"
}
```

---

#### Execute Automation Rule
Manually execute an automation rule.

**Endpoint:** `POST /api/rules/:userId/:ruleId/execute`

**Path Parameters:**
- `userId`: User identifier
- `ruleId`: Rule identifier

**Example:**
```bash
curl -X POST "http://localhost:3000/api/rules/user123/rule456/execute"
```

**Response:**
```json
{
  "success": true,
  "result": {
    "emailsProcessed": 5,
    "attachmentsSaved": 8,
    "errors": [],
    "executionTime": 2340
  }
}
```

**Error Response:**
```json
{
  "success": true,
  "result": {
    "emailsProcessed": 3,
    "attachmentsSaved": 4,
    "errors": [
      {
        "emailId": "AAMkAGI...",
        "subject": "Failed Email",
        "error": "Upload failed: Network timeout"
      }
    ],
    "executionTime": 5000
  }
}
```

---

#### Get Process Logs
Get execution logs for automation rules.

**Endpoint:** `GET /api/rules/:userId/logs`

**Path Parameters:**
- `userId`: User identifier

**Query Parameters:**
- `limit` (optional, default: 50): Number of logs to return

**Example:**
```bash
curl "http://localhost:3000/api/rules/user123/logs?limit=20"
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "logs": [
    {
      "id": "log123",
      "userId": "user123",
      "ruleId": "rule456",
      "timestamp": "2024-01-15T10:00:00.000Z",
      "emailsProcessed": 5,
      "attachmentsSaved": 8,
      "errors": [],
      "success": true
    }
  ]
}
```

---

### Utility Endpoints

#### Health Check
Check API health status.

**Endpoint:** `GET /health`

**Example:**
```bash
curl "http://localhost:3000/health"
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 123456.789,
  "environment": "development"
}
```

---

#### API Information
Get API information and available endpoints.

**Endpoint:** `GET /`

**Example:**
```bash
curl "http://localhost:3000/"
```

**Response:**
```json
{
  "message": "Email to OneDrive Automation API",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 20 requests per 15 minutes
- **Upload endpoints**: 50 requests per 15 minutes

When rate limit is exceeded, the API returns:

**Status Code:** `429 Too Many Requests`

**Response:**
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (access denied) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Common Error Scenarios

### Authentication Errors

```json
{
  "error": "User not authenticated. Please sign in first.",
  "authenticated": false
}
```

### Token Expired

```json
{
  "error": "Access token expired. Please re-authenticate.",
  "authenticated": false
}
```

### Invalid Parameters

```json
{
  "error": "Validation error",
  "details": "userId is required"
}
```

### Graph API Errors

```json
{
  "error": "Graph API error",
  "code": "ErrorItemNotFound",
  "details": { ... }
}
```

## Usage Examples

### Complete Workflow Example

```bash
# 1. Start authentication
curl "http://localhost:3000/api/auth/signin?userId=user123"
# -> Open authUrl in browser and sign in

# 2. Check auth status
curl "http://localhost:3000/api/auth/status/user123"

# 3. List emails
curl "http://localhost:3000/api/emails/user123?folder=inbox&top=10"

# 4. Create automation rule
curl -X POST "http://localhost:3000/api/rules/user123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auto-save Invoices",
    "sourceFolder": "inbox",
    "targetFolder": "/Invoices/{year}",
    "filters": {
      "subject": "Invoice",
      "hasAttachments": true,
      "attachmentExtensions": ["pdf"]
    },
    "schedule": "manual",
    "enabled": true
  }'

# 5. Execute rule
curl -X POST "http://localhost:3000/api/rules/user123/RULE_ID/execute"

# 6. Check logs
curl "http://localhost:3000/api/rules/user123/logs?limit=10"
```

## Best Practices

1. **Always check authentication status** before making API calls
2. **Handle token refresh** - The system auto-refreshes, but user may need to re-auth
3. **Use appropriate rate limits** - Implement exponential backoff for retries
4. **Validate file sizes** before upload - Large files take longer
5. **Monitor automation rules** - Check logs regularly for errors
6. **Use specific filters** - More specific filters = faster execution
7. **Test rules manually** before enabling automated execution
8. **Handle errors gracefully** - Network issues can occur

## Support

For issues or questions:
- Check [README.md](./README.md) for setup instructions
- See [SETUP.md](./SETUP.md) for Azure AD and Firebase configuration
- Open an issue on GitHub
