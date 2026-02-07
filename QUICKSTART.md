# Quick Start Guide

Get the Email to OneDrive Automation API up and running in minutes.

## Prerequisites

- Node.js 16 or higher
- npm or yarn
- Microsoft Azure account
- Firebase account

## Step 1: Clone and Install

```bash
git clone https://github.com/pvoegele/ms-email-automation-to-drive.git
cd ms-email-automation-to-drive
npm install
```

## Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

You'll need to obtain:
- **Azure AD credentials** (CLIENT_ID, CLIENT_SECRET, TENANT_ID)
- **Firebase credentials** (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)

See [SETUP.md](./SETUP.md) for detailed instructions on obtaining these credentials.

## Step 3: Verify Configuration

```bash
npm run verify
```

This will check if all required environment variables are set correctly.

## Step 4: Start the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your .env file).

## Step 5: Test the API

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 12.345,
  "environment": "development"
}
```

### Get API Information
```bash
curl http://localhost:3000/
```

This returns a list of all available endpoints.

## Step 6: Authenticate a User

```bash
# Get the sign-in URL
curl "http://localhost:3000/api/auth/signin?userId=testuser"
```

Open the returned `authUrl` in your browser and sign in with a Microsoft account.

## Step 7: Create Your First Automation Rule

Once authenticated, create an automation rule:

```bash
curl -X POST "http://localhost:3000/api/rules/testuser" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Save PDF Attachments",
    "sourceFolder": "inbox",
    "targetFolder": "/EmailAttachments/{year}/{month}",
    "filters": {
      "hasAttachments": true,
      "attachmentExtensions": ["pdf"]
    },
    "schedule": "manual",
    "enabled": true
  }'
```

## Step 8: Execute the Rule

```bash
# Replace RULE_ID with the ID returned from step 7
curl -X POST "http://localhost:3000/api/rules/testuser/RULE_ID/execute"
```

## Next Steps

- **Read the full documentation**: [README.md](./README.md)
- **Explore API endpoints**: [API_DOCS.md](./API_DOCS.md)
- **Configure Azure AD properly**: [SETUP.md](./SETUP.md)
- **Set up a frontend** to interact with the API
- **Deploy to production** using your preferred hosting platform

## Troubleshooting

### Server won't start
- Run `npm run verify` to check configuration
- Check if all environment variables are set
- Verify Firebase credentials are correct
- Check if port 3000 is already in use

### Authentication fails
- Verify Azure AD app registration is correct
- Check redirect URI matches your configuration
- Ensure API permissions are granted and admin consent is given
- Check CLIENT_ID and CLIENT_SECRET are correct

### Firebase errors
- Verify Firebase project ID is correct
- Check if Firestore is enabled in Firebase console
- Ensure service account credentials are correct
- Verify FIREBASE_PRIVATE_KEY has proper `\n` characters

### Can't connect to Microsoft Graph
- Ensure user has authenticated (check `/api/auth/status/:userId`)
- Verify required permissions are granted
- Check if access token has expired (system auto-refreshes)

## Common Commands

```bash
# Install dependencies
npm install

# Verify configuration
npm run verify

# Start development server
npm run dev

# Start production server
npm start

# Check for security vulnerabilities
npm audit

# Update dependencies
npm update
```

## Development Tips

1. **Use nodemon for development**: Changes are automatically reloaded
2. **Check logs**: Server logs show detailed information about requests and errors
3. **Test with curl or Postman**: Easy to test API endpoints
4. **Monitor Firebase console**: See real-time data updates
5. **Use LOG_LEVEL=debug**: For more detailed logging during development

## Production Deployment

When deploying to production:

1. Set `NODE_ENV=production` in environment
2. Use a process manager (PM2, systemd)
3. Enable HTTPS (use reverse proxy like nginx)
4. Set up monitoring and alerting
5. Configure backup for Firebase data
6. Use secrets management (AWS Secrets Manager, Azure Key Vault)
7. Update CORS origin to your production frontend URL

Example with PM2:
```bash
npm install -g pm2
pm2 start src/server.js --name email-automation
pm2 save
pm2 startup
```

## Getting Help

- **Documentation**: Check README.md, SETUP.md, and API_DOCS.md
- **Issues**: Open an issue on GitHub
- **Logs**: Check server logs for error details
- **Verification**: Run `npm run verify` to check configuration

## What's Next?

- Build a frontend application to interact with this API
- Set up scheduled automation rules
- Add more complex filters for email processing
- Integrate with other services
- Add monitoring and analytics

Happy automating! 🚀
