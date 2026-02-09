import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Email to OneDrive Automation API',
      version: '1.0.0',
      description: 'A powerful Node.js/Express backend API for automating email processing and attachment management with Microsoft Graph API and OneDrive integration.',
      contact: {
        name: 'API Support',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Microsoft OAuth 2.0 access token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
            },
          },
        },
        AuthUrl: {
          type: 'object',
          properties: {
            authUrl: {
              type: 'string',
              format: 'uri',
              description: 'Microsoft OAuth authorization URL',
            },
            message: {
              type: 'string',
            },
          },
        },
        AuthStatus: {
          type: 'object',
          properties: {
            authenticated: {
              type: 'boolean',
            },
            expiresOn: {
              type: 'string',
              format: 'date-time',
            },
            expired: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
          },
        },
        Email: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            subject: { type: 'string' },
            from: { type: 'object' },
            receivedDateTime: { type: 'string', format: 'date-time' },
            bodyPreview: { type: 'string' },
            hasAttachments: { type: 'boolean' },
          },
        },
        EmailList: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            count: { type: 'number' },
            emails: {
              type: 'array',
              items: { $ref: '#/components/schemas/Email' },
            },
          },
        },
        Attachment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            contentType: { type: 'string' },
            size: { type: 'number' },
            contentBytes: { type: 'string', format: 'base64' },
          },
        },
        OneDriveItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            folder: { type: 'object' },
            file: { type: 'object' },
            webUrl: { type: 'string', format: 'uri' },
          },
        },
        AutomationRule: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            name: { type: 'string' },
            enabled: { type: 'boolean' },
            targetFolder: { type: 'string' },
            filters: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Microsoft OAuth 2.0 authentication endpoints',
      },
      {
        name: 'Emails',
        description: 'Email retrieval and management endpoints',
      },
      {
        name: 'OneDrive',
        description: 'OneDrive folder and file management endpoints',
      },
      {
        name: 'Rules',
        description: 'Automation rules management endpoints',
      },
      {
        name: 'Health',
        description: 'Health check and system information',
      },
    ],
  },
  apis: [
    join(rootDir, 'src', 'routes', '*.js'),
    join(rootDir, 'src', 'server.js'),
  ], // Paths to files containing OpenAPI definitions
};

let swaggerSpec;
try {
  swaggerSpec = swaggerJsdoc(options);
  // Validate that we have paths
  if (!swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
    console.warn('⚠️  Swagger spec generated but no paths found. Check file paths in apis array.');
    console.warn('Looking for files in:', options.apis);
  } else {
    console.log(`✅ Swagger spec generated with ${Object.keys(swaggerSpec.paths).length} paths`);
  }
} catch (error) {
  console.error('❌ Error generating Swagger spec:', error);
  throw error;
}

export { swaggerSpec };

// Swagger UI options for better presentation
export const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f9fafb; padding: 15px; border-radius: 4px; margin: 20px 0; }
  `,
  customSiteTitle: 'Email to OneDrive Automation API',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list', // 'none', 'list', or 'full'
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
  },
};

