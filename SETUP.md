# Setup Guide - Azure AD & Firebase Configuration

This guide walks you through setting up Microsoft Azure AD and Firebase for the Email to OneDrive Automation API.

## Table of Contents
- [Azure AD App Registration](#azure-ad-app-registration)
- [Firebase Project Setup](#firebase-project-setup)
- [Environment Configuration](#environment-configuration)
- [Testing the Setup](#testing-the-setup)

## Azure AD App Registration

### 1. Create Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: Email to OneDrive Automation
   - **Supported account types**: 
     - Select "Accounts in any organizational directory (Any Azure AD directory - Multitenant)" for multi-tenant support
     - Or select "Accounts in this organizational directory only" for single tenant
   - **Redirect URI**: 
     - Platform: Web
     - URI: `http://localhost:3000/api/auth/callback`
5. Click **Register**

### 2. Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph** > **Delegated permissions**
4. Add the following permissions:
   - `User.Read`
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Files.ReadWrite.All`
   - `offline_access`
5. Click **Add permissions**
6. Click **Grant admin consent for [Your Organization]** (requires admin privileges)

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description (e.g., "API Secret")
4. Select expiration period (e.g., 24 months)
5. Click **Add**
6. **Important**: Copy the secret value immediately (it won't be shown again)

### 4. Get Application IDs

1. Go to **Overview** page
2. Copy the following values:
   - **Application (client) ID** → This is your `CLIENT_ID`
   - **Directory (tenant) ID** → This is your `TENANT_ID`
   - Client secret from step 3 → This is your `CLIENT_SECRET`

### 5. Configure Redirect URIs (for production)

1. Go to **Authentication**
2. Add additional redirect URIs for your production environment:
   - `https://yourdomain.com/api/auth/callback`
3. Enable **ID tokens** if needed
4. Save changes

## Firebase Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project**
3. Enter project name (e.g., "email-automation")
4. Configure Google Analytics (optional)
5. Click **Create project**

### 2. Enable Firestore Database

1. In Firebase console, go to **Firestore Database**
2. Click **Create database**
3. Choose mode:
   - **Production mode** (recommended for production)
   - **Test mode** (for development only)
4. Select Cloud Firestore location (choose closest to your users)
5. Click **Enable**

### 3. Set Up Firestore Security Rules

1. Go to **Firestore Database** > **Rules**
2. Update the rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - only service account can access
    match /users/{userId} {
      allow read, write: if false;
    }
    
    // Automation rules - only service account can access
    match /automationRules/{ruleId} {
      allow read, write: if false;
    }
    
    // Process logs - only service account can access
    match /processLogs/{logId} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**

### 4. Create Service Account

1. In Firebase console, click the gear icon > **Project settings**
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Click **Generate key** (a JSON file will be downloaded)
5. **Important**: Keep this file secure and never commit it to version control

### 5. Extract Firebase Credentials

From the downloaded JSON file, extract:
- `project_id` → This is your `FIREBASE_PROJECT_ID`
- `client_email` → This is your `FIREBASE_CLIENT_EMAIL`
- `private_key` → This is your `FIREBASE_PRIVATE_KEY`

**Note**: The private key contains `\n` characters for newlines. Keep them as `\n` in the .env file.

### 6. Create Firestore Indexes (Optional but Recommended)

For better query performance, create these indexes:

1. Go to **Firestore Database** > **Indexes**
2. Create composite indexes:
   - Collection: `automationRules`
     - Fields: `userId` (Ascending), `createdAt` (Descending)
   - Collection: `processLogs`
     - Fields: `userId` (Ascending), `timestamp` (Descending)

Or create them automatically by running queries (Firestore will prompt you).

## Environment Configuration

### 1. Create .env File

```bash
cp .env.example .env
```

### 2. Fill in Environment Variables

```env
# Microsoft Azure AD
CLIENT_ID=00000000-0000-0000-0000-000000000000
CLIENT_SECRET=your_client_secret_from_azure
TENANT_ID=common
REDIRECT_URI=http://localhost:3000/api/auth/callback

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n"

# App Config
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Optional
LOG_LEVEL=info
```

### 3. Verify Configuration

Run a configuration check:

```bash
npm start
```

Look for successful initialization messages:
- `Firebase initialized successfully`
- `Server running on port 3000`

## Testing the Setup

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### 2. Test Authentication Flow

1. Get sign-in URL:
```bash
curl "http://localhost:3000/api/auth/signin?userId=testuser123"
```

2. Open the returned `authUrl` in a browser
3. Sign in with Microsoft account
4. You should be redirected to your frontend with success message

3. Check authentication status:
```bash
curl http://localhost:3000/api/auth/status/testuser123
```

### 3. Test Email Listing (requires authentication)

```bash
curl "http://localhost:3000/api/emails/testuser123?folder=inbox&top=10"
```

## Production Configuration

### 1. Update Redirect URIs

In Azure AD app registration:
- Add production redirect URI: `https://yourdomain.com/api/auth/callback`
- Update `REDIRECT_URI` in production .env

### 2. Update CORS Origin

Update `FRONTEND_URL` environment variable to your production frontend URL:
```env
FRONTEND_URL=https://your-frontend-domain.com
```

### 3. Enable Production Mode

```env
NODE_ENV=production
LOG_LEVEL=warn
```

### 4. Secure Environment Variables

- Never commit `.env` file to version control
- Use secure environment variable management (e.g., AWS Secrets Manager, Azure Key Vault)
- Rotate client secrets regularly
- Use HTTPS in production

### 5. Firestore Production Rules

Update Firestore rules to production mode if you haven't already.

## Troubleshooting

### Azure AD Issues

**Problem**: "AADSTS50011: The reply URL specified in the request does not match"
- **Solution**: Verify redirect URI in Azure AD matches exactly with your .env configuration

**Problem**: "AADSTS65001: The user or administrator has not consented"
- **Solution**: Grant admin consent for API permissions in Azure AD

**Problem**: "Token refresh failed"
- **Solution**: Ensure `offline_access` scope is included in API permissions

### Firebase Issues

**Problem**: "Failed to initialize Firebase"
- **Solution**: Check if `FIREBASE_PRIVATE_KEY` has proper `\n` characters for newlines
- **Solution**: Verify all three Firebase credentials are correct

**Problem**: "Permission denied" when accessing Firestore
- **Solution**: Check Firestore security rules
- **Solution**: Verify service account has proper permissions

**Problem**: "Quota exceeded"
- **Solution**: Check Firebase billing plan
- **Solution**: Monitor Firestore usage in Firebase console

### Network Issues

**Problem**: "ECONNREFUSED" or timeout errors
- **Solution**: Check if firewall allows outbound connections to Microsoft and Firebase
- **Solution**: Verify network proxy settings if behind corporate firewall

## Security Best Practices

1. **Rotate Secrets Regularly**
   - Change Azure client secrets every 6-12 months
   - Regenerate Firebase service account keys periodically

2. **Limit Permissions**
   - Only grant necessary API permissions
   - Use least-privilege principle for Firestore rules

3. **Monitor Access**
   - Enable Azure AD sign-in logs
   - Monitor Firebase usage and authentication attempts

4. **Secure Storage**
   - Never commit secrets to version control
   - Use environment-specific configurations
   - Encrypt sensitive data at rest

5. **Rate Limiting**
   - API includes built-in rate limiting
   - Monitor for unusual activity patterns

## Next Steps

After completing the setup:

1. Test all API endpoints
2. Create your first automation rule
3. Set up monitoring and logging
4. Deploy to production environment
5. Configure backup and disaster recovery

For API usage, see [README.md](./README.md) and [API_DOCS.md](./API_DOCS.md)
