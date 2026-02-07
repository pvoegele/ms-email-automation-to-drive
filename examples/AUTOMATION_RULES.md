# Automation Rule Examples

This document provides real-world examples of automation rules for various use cases.

## Example 1: Save All Invoice Attachments

Automatically save PDF and Excel invoices to a folder organized by year and month.

```json
{
  "name": "Auto-save Invoices",
  "sourceFolder": "inbox",
  "targetFolder": "/Invoices/{year}/{month}",
  "filters": {
    "subject": "invoice",
    "hasAttachments": true,
    "attachmentExtensions": ["pdf", "xlsx", "xls"]
  },
  "schedule": "manual",
  "enabled": true,
  "markAsRead": false
}
```

**How it works:**
- Searches inbox for emails containing "invoice" in the subject
- Only processes emails with attachments
- Only saves PDF and Excel files
- Organizes files by year/month (e.g., `/Invoices/2024/01`)
- Does not mark emails as read

---

## Example 2: Archive Reports from Specific Sender

Save monthly reports from a specific sender to a dedicated folder.

```json
{
  "name": "Monthly Reports Archive",
  "sourceFolder": "inbox",
  "targetFolder": "/Reports/Monthly/{sender}",
  "filters": {
    "senderEmail": "reports@company.com",
    "subject": "Monthly Report",
    "hasAttachments": true,
    "attachmentExtensions": ["pdf", "docx"]
  },
  "schedule": {
    "type": "interval",
    "intervalMinutes": 60
  },
  "enabled": true,
  "markAsRead": true
}
```

**How it works:**
- Only processes emails from reports@company.com
- Must contain "Monthly Report" in subject
- Saves to folder organized by sender name
- Runs automatically every hour
- Marks processed emails as read

---

## Example 3: Save All Attachments from Important Contacts

Archive all attachments from VIP contacts.

```json
{
  "name": "VIP Attachments",
  "sourceFolder": "inbox",
  "targetFolder": "/VIP/{sender}/{year}",
  "filters": {
    "senderEmail": "vip@client.com",
    "hasAttachments": true
  },
  "schedule": "manual",
  "enabled": true
}
```

**How it works:**
- Processes emails from specific VIP contact
- Saves all attachments regardless of type
- Organizes by sender and year
- Manual execution (run when needed)

---

## Example 4: Save Large Files Only

Only save attachments larger than 1MB.

```json
{
  "name": "Large Files",
  "sourceFolder": "inbox",
  "targetFolder": "/LargeFiles/{date}",
  "filters": {
    "hasAttachments": true,
    "minFileSize": 1048576
  },
  "schedule": "manual",
  "enabled": true
}
```

**How it works:**
- Filters for files larger than 1MB (1048576 bytes)
- Organizes by full date (YYYY-MM-DD)
- Saves all file types

---

## Example 5: Process Recent Emails Only

Only process emails from the last 7 days.

```json
{
  "name": "Recent Attachments",
  "sourceFolder": "inbox",
  "targetFolder": "/Recent",
  "filters": {
    "hasAttachments": true,
    "dateFrom": "2024-01-08T00:00:00Z"
  },
  "schedule": "manual",
  "enabled": true
}
```

**How it works:**
- Only processes emails received after specified date
- Update `dateFrom` to current date minus 7 days when executing
- Saves all attachments to single folder

---

## Example 6: Contract Documents Archive

Save contract-related documents with specific file types.

```json
{
  "name": "Contract Documents",
  "sourceFolder": "inbox",
  "targetFolder": "/Contracts/{year}/{sender}",
  "filters": {
    "subject": "contract",
    "hasAttachments": true,
    "attachmentExtensions": ["pdf", "docx", "doc"],
    "minFileSize": 10240
  },
  "schedule": {
    "type": "interval",
    "intervalMinutes": 30
  },
  "enabled": true
}
```

**How it works:**
- Searches for "contract" in subject
- Only saves documents (PDF, Word)
- Filters out very small files (< 10KB)
- Runs every 30 minutes
- Organizes by year and sender

---

## Example 7: Photo Attachments

Save all photo attachments from emails.

```json
{
  "name": "Photo Archive",
  "sourceFolder": "inbox",
  "targetFolder": "/Photos/{year}/{month}",
  "filters": {
    "hasAttachments": true,
    "attachmentExtensions": ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "heic"]
  },
  "schedule": "manual",
  "enabled": true
}
```

**How it works:**
- Filters for common image formats
- Organizes by year and month
- Manual execution

---

## Example 8: Daily Backup of Specific Folder

Process emails from a specific folder (not inbox).

```json
{
  "name": "Archive Folder Backup",
  "sourceFolder": "Archive",
  "targetFolder": "/Backup/{year}",
  "filters": {
    "hasAttachments": true
  },
  "schedule": {
    "type": "interval",
    "intervalMinutes": 1440
  },
  "enabled": true
}
```

**How it works:**
- Processes emails from "Archive" folder
- Saves all attachments
- Runs once per day (1440 minutes = 24 hours)
- Organizes by year only

---

## Example 9: Financial Documents

Save financial documents with size limits.

```json
{
  "name": "Financial Docs",
  "sourceFolder": "inbox",
  "targetFolder": "/Finance/{year}/{month}",
  "filters": {
    "subject": "statement",
    "hasAttachments": true,
    "attachmentExtensions": ["pdf"],
    "maxFileSize": 10485760
  },
  "schedule": "manual",
  "enabled": true,
  "markAsRead": true
}
```

**How it works:**
- Looks for "statement" in subject
- Only PDFs
- Max 10MB file size
- Organizes by year/month
- Marks as read after processing

---

## Example 10: Multiple Sender Filter

Process emails from multiple important senders (requires multiple rules).

**Rule for Sender 1:**
```json
{
  "name": "Client A Documents",
  "sourceFolder": "inbox",
  "targetFolder": "/Clients/ClientA/{date}",
  "filters": {
    "senderEmail": "contact@clienta.com",
    "hasAttachments": true
  },
  "schedule": {
    "type": "interval",
    "intervalMinutes": 15
  },
  "enabled": true
}
```

**Rule for Sender 2:**
```json
{
  "name": "Client B Documents",
  "sourceFolder": "inbox",
  "targetFolder": "/Clients/ClientB/{date}",
  "filters": {
    "senderEmail": "contact@clientb.com",
    "hasAttachments": true
  },
  "schedule": {
    "type": "interval",
    "intervalMinutes": 15
  },
  "enabled": true
}
```

---

## Filter Options Reference

### Available Filters

| Filter | Type | Description | Example |
|--------|------|-------------|---------|
| `senderEmail` | string | Filter by sender email address | `"user@example.com"` |
| `subject` | string | Filter by subject keyword (contains) | `"invoice"` |
| `hasAttachments` | boolean | Require attachments | `true` |
| `attachmentExtensions` | array | Allowed file extensions | `["pdf", "docx"]` |
| `minFileSize` | number | Minimum file size in bytes | `1048576` (1MB) |
| `maxFileSize` | number | Maximum file size in bytes | `10485760` (10MB) |
| `dateFrom` | string | Start date (ISO 8601) | `"2024-01-01T00:00:00Z"` |
| `dateTo` | string | End date (ISO 8601) | `"2024-12-31T23:59:59Z"` |

### Target Folder Variables

| Variable | Description | Example Result |
|----------|-------------|----------------|
| `{sender}` | Email sender name | `John Doe` |
| `{date}` | Full date (YYYY-MM-DD) | `2024-01-15` |
| `{year}` | Year (YYYY) | `2024` |
| `{month}` | Month (MM) | `01` |

### Schedule Options

**Manual execution:**
```json
"schedule": "manual"
```

**Interval-based (every 15 minutes):**
```json
"schedule": {
  "type": "interval",
  "intervalMinutes": 15
}
```

**Common intervals:**
- 15 minutes: `"intervalMinutes": 15`
- 30 minutes: `"intervalMinutes": 30`
- 1 hour: `"intervalMinutes": 60`
- 6 hours: `"intervalMinutes": 360`
- Daily: `"intervalMinutes": 1440`

---

## Best Practices

1. **Start with manual execution** - Test rules before enabling automatic scheduling
2. **Use specific filters** - More specific = faster execution and better results
3. **Organize with variables** - Use `{year}`, `{month}`, `{sender}` for better organization
4. **Monitor logs** - Check process logs regularly to catch errors
5. **Test with small batches** - Test on a few emails first before processing thousands
6. **Use file size limits** - Prevent processing very large files that might cause issues
7. **Set appropriate intervals** - Don't run too frequently (recommended: 15+ minutes)
8. **One rule per purpose** - Keep rules focused on specific tasks
9. **Name rules clearly** - Use descriptive names for easy management
10. **Disable unused rules** - Set `enabled: false` for rules not in use

---

## Creating Rules via API

### Using curl

```bash
curl -X POST "http://localhost:3000/api/rules/YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Rule",
    "sourceFolder": "inbox",
    "targetFolder": "/MyFolder",
    "filters": {
      "hasAttachments": true
    },
    "schedule": "manual",
    "enabled": true
  }'
```

### Using JavaScript

```javascript
const createRule = async (userId, ruleData) => {
  const response = await fetch(`http://localhost:3000/api/rules/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ruleData),
  });
  
  return await response.json();
};

// Usage
const rule = await createRule('user123', {
  name: 'My Rule',
  sourceFolder: 'inbox',
  targetFolder: '/MyFolder',
  filters: { hasAttachments: true },
  schedule: 'manual',
  enabled: true,
});

console.log('Rule created:', rule.ruleId);
```

---

## Testing Rules

Before enabling automatic execution:

1. Create rule with `"schedule": "manual"` and `"enabled": true`
2. Execute manually: `POST /api/rules/:userId/:ruleId/execute`
3. Check the results in OneDrive
4. Review the execution logs: `GET /api/rules/:userId/logs`
5. If satisfied, update schedule to interval-based
6. Monitor logs for the first few automatic runs

---

## Troubleshooting Rules

### No emails processed
- Check if filters are too restrictive
- Verify source folder name is correct
- Ensure user has emails matching the filters
- Check if rule is enabled

### Wrong files uploaded
- Review attachment extension filters
- Check file size filters
- Verify filter logic matches intent

### Files in wrong folder
- Check target folder path
- Verify variables are correctly formatted
- Ensure folders exist (system creates them automatically)

### Rule execution fails
- Check process logs for error details
- Verify OneDrive has enough storage
- Check network connectivity
- Ensure user authentication is valid

---

For more information, see the [API Documentation](../API_DOCS.md).
