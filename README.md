# Email to OneDrive Automation - Backend API

A powerful Node.js/Express backend API for automating email processing and attachment management with Microsoft Graph API and OneDrive integration.

## 🚀 Features

- **Microsoft OAuth 2.0 Authentication** - Secure multi-tenant authentication with automatic token refresh
- **Email Processing** - Fetch, filter, and process emails from any Microsoft mailbox
- **OneDrive Integration** - Upload attachments to OneDrive with support for large files (chunked upload)
- **Automation Rules** - Create and manage automation rules with custom filters
- **Firebase Integration** - Store user tokens, rules, and process logs in Firestore
- **Rate Limiting** - Built-in rate limiting for API protection
- **Error Handling** - Comprehensive error handling and logging
- **RESTful API** - Clean and intuitive REST API endpoints

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 16+ installed
- Microsoft Azure account with an Azure AD app registration
- Firebase project with Firestore enabled (see [why Firestore?](./DATABASE_CHOICE.md))
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pvoegele/ms-email-automation-to-drive.git
   cd ms-email-automation-to-drive
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your credentials (see Configuration section below)

4. **Set up Azure AD** (see [SETUP.md](./SETUP.md) for detailed instructions)

5. **Set up Firebase** (see [SETUP.md](./SETUP.md) for detailed instructions)

## ⚙️ Configuration

### Environment Variables

Edit your `.env` file with the following:

```env
# Microsoft Azure AD
CLIENT_ID=your_azure_client_id
CLIENT_SECRET=your_azure_client_secret
TENANT_ID=common
REDIRECT_URI=http://localhost:3000/api/auth/callback

# Firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# App Config
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Optional
LOG_LEVEL=info
```

### Required Microsoft Graph Scopes

- `User.Read` - Read user profile
- `Mail.Read` - Read emails
- `Mail.ReadWrite` - Read and modify emails
- `Files.ReadWrite.All` - Full access to OneDrive files
- `offline_access` - Maintain access via refresh tokens

## 🚦 Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

#### Get Sign-In URL
```http
GET /api/auth/signin?userId={userId}
```

**Response:**
```json
{
  "authUrl": "https://login.microsoftonline.com/...",
  "message": "Please navigate to this URL to sign in"
}
```

#### OAuth Callback
```http
GET /api/auth/callback?code={code}&state={userId}
```
Redirects to frontend with success/error status

#### Check Auth Status
```http
GET /api/auth/status/:userId
```

**Response:**
```json
{
  "authenticated": true,
  "expiresOn": "2024-01-01T00:00:00.000Z",
  "expired": false,
  "message": "User authenticated"
}
```

### Email Endpoints

#### List Emails
```http
GET /api/emails/:userId?folder=inbox&top=50&skip=0
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "emails": [...]
}
```

#### Get Email Attachments
```http
GET /api/emails/:userId/:messageId/attachments
```

### OneDrive Endpoints

#### List Folders
```http
GET /api/onedrive/:userId/folders?path=/
```

#### Create Folder
```http
POST /api/onedrive/:userId/folders
Content-Type: application/json

{
  "folderName": "MyFolder",
  "parentPath": "/"
}
```

#### Upload File
```http
POST /api/onedrive/:userId/upload
Content-Type: application/json

{
  "fileName": "document.pdf",
  "fileContent": "base64_encoded_content",
  "folderPath": "/EmailAttachments"
}
```

### Automation Rules Endpoints

#### List Rules
```http
GET /api/rules/:userId
```

#### Create Rule
```http
POST /api/rules/:userId
Content-Type: application/json

{
  "name": "Save Invoice Attachments",
  "sourceFolder": "inbox",
  "targetFolder": "/Invoices/{year}/{month}",
  "filters": {
    "senderEmail": "invoices@example.com",
    "hasAttachments": true,
    "attachmentExtensions": ["pdf", "xlsx"]
  },
  "schedule": "manual",
  "enabled": true
}
```

#### Execute Rule
```http
POST /api/rules/:userId/:ruleId/execute
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

#### Get Process Logs
```http
GET /api/rules/:userId/logs?limit=50
```

### Health Check
```http
GET /health
```

For complete API documentation, see [API_DOCS.md](./API_DOCS.md)

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Configured for specific origin
- **Rate Limiting** - Protection against abuse
- **Token Refresh** - Automatic token renewal
- **Input Validation** - Request validation
- **Error Sanitization** - Safe error messages

## 📁 Project Structure

```
src/
├── auth/
│   ├── msalConfig.js          # Microsoft authentication configuration
│   └── middleware.js          # Auth middleware
├── services/
│   ├── graphClient.js         # Microsoft Graph API client
│   ├── automationEngine.js    # Email processing automation
│   └── firebase.js            # Firebase Firestore database
├── routes/
│   ├── auth.js                # Authentication endpoints
│   ├── emails.js              # Email operations
│   ├── onedrive.js            # OneDrive operations
│   └── rules.js               # Automation rules CRUD
├── middleware/
│   ├── errorHandler.js        # Global error handling
│   └── rateLimiter.js         # Rate limiting
├── utils/
│   └── logger.js              # Logging utility
└── server.js                  # Main Express server
```

## 🔧 Automation Rules

Automation rules allow you to automatically process emails and save attachments to OneDrive.

### Rule Configuration

```javascript
{
  "name": "Rule name",
  "sourceFolder": "inbox",           // Source email folder
  "targetFolder": "/path/to/folder", // OneDrive target folder
  "filters": {
    "senderEmail": "user@example.com",
    "subject": "keyword",
    "hasAttachments": true,
    "attachmentExtensions": ["pdf", "docx"],
    "dateFrom": "2024-01-01T00:00:00Z",
    "dateTo": "2024-12-31T23:59:59Z"
  },
  "schedule": "manual",              // or { type: "interval", intervalMinutes: 15 }
  "enabled": true
}
```

### Target Folder Variables

Use these variables in `targetFolder` path:
- `{sender}` - Email sender name
- `{date}` - Full date (YYYY-MM-DD)
- `{year}` - Year (YYYY)
- `{month}` - Month (MM)

Example: `/Invoices/{year}/{month}/{sender}`

## 📊 Firebase Schema

### Users Collection
```
users/{userId}
  - tokens: { accessToken, refreshToken, expiresOn }
  - updatedAt: timestamp
```

### Automation Rules Collection
```
automationRules/{ruleId}
  - userId: string
  - name: string
  - sourceFolder: string
  - targetFolder: string
  - filters: object
  - schedule: string | object
  - enabled: boolean
  - stats: { totalProcessed, totalAttachments, errors }
  - createdAt: timestamp
  - lastRun: timestamp
```

### Process Logs Collection
```
processLogs/{logId}
  - userId: string
  - ruleId: string
  - timestamp: timestamp
  - emailsProcessed: number
  - attachmentsSaved: number
  - errors: array
  - success: boolean
```

## 🐛 Troubleshooting

### Common Issues

1. **Token Refresh Failed**
   - Ensure `offline_access` scope is included
   - Check if refresh token is valid
   - User may need to re-authenticate

2. **Firebase Connection Error**
   - Verify Firebase credentials in `.env`
   - Check if private key has proper newline characters (`\n`)
   - Ensure Firestore is enabled in Firebase console

3. **Graph API Errors**
   - Check Microsoft Graph API permissions in Azure AD
   - Verify admin consent has been granted
   - Ensure scopes are correctly configured

4. **Large File Upload Fails**
   - Files > 4MB automatically use chunked upload
   - Check network timeout settings
   - Verify OneDrive storage quota

## 📝 License

ISC

## 📖 Additional Documentation

- [Setup Guide](./SETUP.md) - Detailed Azure AD and Firebase setup
- [API Documentation](./API_DOCS.md) - Complete API reference
- [Quick Start](./QUICKSTART.md) - Get started quickly
- [Automation Examples](./examples/AUTOMATION_RULES.md) - Real-world rule examples
- **[Database Choice](./DATABASE_CHOICE.md)** - Why we recommend Cloud Firestore

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please open an issue on GitHub.
