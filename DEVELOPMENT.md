# Development Guide

## Getting Started with Development

This guide helps you set up your local development environment and start working on the email-to-OneDrive automation backend API.

## Prerequisites

- Node.js 16+ installed
- Git
- A code editor (VS Code recommended)
- Basic knowledge of Node.js and Express

## Quick Setup

### 1. Clone and Install

```bash
git clone https://github.com/pvoegele/ms-email-automation-to-drive.git
cd ms-email-automation-to-drive
npm install
```

### 2. Set Up Environment

For local development without real Azure/Firebase credentials:

```bash
cp .env.development .env
```

For production or testing with real services:

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Verify Configuration

```bash
npm run verify
```

## Development Workflow

### Running the Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

### Running Tests

**Run all tests:**
```bash
npm test
```

**Run tests in watch mode:**
```bash
npm test:watch
```

**Run tests with coverage:**
```bash
npm test:coverage
```

### Test Structure

Tests are located in `src/__tests__/` directory:

```
src/__tests__/
├── utils/
│   └── logger.test.js
├── middleware/
│   ├── errorHandler.test.js
│   └── rateLimiter.test.js
├── routes/
│   └── auth.test.js
└── services/
    └── (add your service tests here)
```

## Project Structure

```
src/
├── auth/                   # Authentication logic
│   ├── msalConfig.js      # Microsoft OAuth configuration
│   └── middleware.js      # Auth middleware
├── services/               # Business logic
│   ├── graphClient.js     # Microsoft Graph API
│   ├── firebase.js        # Firestore database
│   └── automationEngine.js # Email processing
├── routes/                 # API endpoints
│   ├── auth.js
│   ├── emails.js
│   ├── onedrive.js
│   └── rules.js
├── middleware/             # Express middleware
│   ├── errorHandler.js
│   └── rateLimiter.js
├── utils/                  # Utilities
│   └── logger.js
├── __tests__/             # Test files
└── server.js              # Main server file
```

## Making Changes

### 1. Create a New Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

Follow these guidelines:
- Write clean, readable code
- Add JSDoc comments for functions
- Follow existing code style
- Keep functions small and focused

### 3. Write Tests

For every new feature or bug fix:

```javascript
// Example test structure
describe('Feature Name', () => {
  test('should do something specific', () => {
    // Arrange
    const input = 'test data';
    
    // Act
    const result = yourFunction(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### 4. Run Tests

```bash
npm test
```

Ensure all tests pass before committing.

### 5. Commit Your Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

Use conventional commit messages:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `test:` for tests
- `refactor:` for refactoring

## Testing Strategies

### Unit Tests

Test individual functions in isolation:

```javascript
import { myFunction } from '../../utils/myUtil.js';

describe('myFunction', () => {
  test('handles valid input', () => {
    expect(myFunction('valid')).toBe('expected');
  });
  
  test('handles invalid input', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Integration Tests

Test API endpoints:

```javascript
import request from 'supertest';
import express from 'express';
import myRoute from '../../routes/myRoute.js';

describe('GET /api/myroute', () => {
  let app;
  
  beforeAll(() => {
    app = express();
    app.use('/api', myRoute);
  });
  
  test('returns data successfully', async () => {
    const response = await request(app)
      .get('/api/myroute')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
  });
});
```

### Mocking

Mock external dependencies:

```javascript
// Mock Firebase
jest.unstable_mockModule('../../services/firebase.js', () => ({
  getUserTokens: jest.fn().mockResolvedValue({
    accessToken: 'mock_token',
  }),
}));
```

## Common Development Tasks

### Adding a New API Endpoint

1. Create route handler in `src/routes/`
2. Add route to `src/server.js`
3. Write tests in `src/__tests__/routes/`
4. Document in `API_DOCS.md`

### Adding a New Service

1. Create service in `src/services/`
2. Export functions
3. Write unit tests
4. Use in routes or other services

### Debugging

**Enable debug logging:**
```bash
LOG_LEVEL=debug npm run dev
```

**Use Node.js debugger:**
```bash
node --inspect src/server.js
```

Then attach your debugger (VS Code, Chrome DevTools)

**Check logs:**
```javascript
import { logger } from './utils/logger.js';

logger.debug('Debug message', { data: someData });
logger.info('Info message');
logger.error('Error message', { error: err });
```

## Code Quality

### Linting

(To be added - ESLint configuration)

```bash
npm run lint
```

### Code Coverage

Check test coverage:

```bash
npm test:coverage
```

Aim for >80% coverage on critical paths.

## Common Issues

### Tests Failing

**Import errors:**
- Ensure all imports use `.js` extension
- Check file paths are correct

**Mock issues:**
- Use `jest.unstable_mockModule()` for ES modules
- Mock before importing modules

**Environment variables:**
- Set test environment variables in test files
- Use `.env.test` for test-specific config

### Server Won't Start

**Port in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Dependencies missing:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Invalid credentials:**
- Check `.env` file exists
- Verify all required variables are set
- Run `npm run verify`

## Performance Tips

1. **Use connection pooling** for databases
2. **Cache frequently accessed data**
3. **Implement pagination** for large datasets
4. **Use async/await** consistently
5. **Monitor memory usage** during development

## Security Checklist

- [ ] Never commit `.env` file
- [ ] Validate all user inputs
- [ ] Use prepared statements for queries
- [ ] Implement rate limiting
- [ ] Enable CORS only for trusted origins
- [ ] Keep dependencies updated
- [ ] Use HTTPS in production

## Git Workflow

```bash
# Update your branch with latest main
git checkout main
git pull origin main
git checkout your-branch
git rebase main

# Push your changes
git push origin your-branch

# Create pull request on GitHub
```

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [Jest Documentation](https://jestjs.io/)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## Getting Help

1. Check existing documentation
2. Search closed issues on GitHub
3. Ask in pull request comments
4. Open a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

## Next Steps

Now that you have the development environment set up:

1. ✅ Run `npm test` to ensure everything works
2. ✅ Start the dev server with `npm run dev`
3. ✅ Make a small change and see tests pass
4. 🚀 Start building features!

## Development Tips

### Hot Reloading

Nodemon automatically restarts the server when you save files.

### Testing Single Files

```bash
npm test -- src/__tests__/utils/logger.test.js
```

### Debugging Tests

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Environment-Specific Config

Create different `.env` files:
- `.env` - Local development
- `.env.test` - Testing
- `.env.production` - Production (never commit!)

### Mock Data

For testing without real services, use mock data in `src/__tests__/mocks/`.

Happy coding! 🚀
