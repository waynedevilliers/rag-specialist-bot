# Testing Guide

## Overview

This project maintains a comprehensive testing framework with 100+ tests covering all major functionality, ensuring reliability, performance, and security.

## Test Categories

### 1. Unit Tests (40+ tests)
Individual component and function validation.

```bash
npm test -- conversation-manager.test.ts  # Session management
npm test -- export-functionality.test.ts  # Export functionality  
npm test -- security.test.ts             # Security validation
```

### 2. Component Tests (50+ tests) 
React components with user interactions.

```bash
npm test -- ChatInterface.test.tsx        # Main chat interface
npm test -- ConversationHistory.test.tsx  # Session history panel
```

### 3. Integration Tests (20+ tests)
API endpoints with realistic scenarios.

```bash
npm test -- route.test.ts                 # API route testing
npm test -- course-integration.test.ts    # Course content integration
```

### 4. Performance Tests
Response times and optimization validation.

```bash
npm test -- rag-performance.test.ts       # RAG system performance
npm test -- greeting.test.ts              # Fast response testing
```

### 5. Security Tests (22+ tests)
Input validation and protection mechanisms.

```bash
npm test -- validation.test.ts            # Input validation
npm test -- security.test.ts              # Security framework
```

## Test Commands

### Basic Testing
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode for development
npm test -- --coverage     # Generate coverage report
```

### Specific Test Categories
```bash
npm run test:course-structure    # Course organization validation
npm run test:integration        # API integration tests
npm run test:validate-courses   # Complete validation suite
```

### Focused Testing
```bash
npm test -- ChatInterface       # Test specific component
npm test -- export             # Test export functionality
npm test -- --testNamePattern="language" # Test language features
```

## Test Coverage Areas

### UI Components
- ✅ Language switching (EN ⟷ DE)
- ✅ Model selection and configuration
- ✅ Mobile responsiveness and touch interactions
- ✅ Export functionality (JSON, CSV, PDF)
- ✅ Error handling and graceful degradation
- ✅ Accessibility features

### Session Management
- ✅ Session creation and persistence
- ✅ Conversation history management
- ✅ Stats calculation and display
- ✅ Export functionality validation
- ✅ localStorage integration

### Core Functionality
- ✅ RAG system performance
- ✅ Multi-model AI integration
- ✅ Security validation framework
- ✅ Course content organization
- ✅ Knowledge base management

### Error Handling
- ✅ Network failure scenarios
- ✅ API error responses
- ✅ Malformed data handling
- ✅ Security violation detection
- ✅ Graceful fallback mechanisms

## Writing Tests

### Test File Structure
```typescript
/**
 * @jest-environment jsdom  // For React components
 */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ComponentToTest from '../ComponentToTest';

describe('ComponentToTest', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should perform expected behavior', () => {
    // Test implementation
  });
});
```

### Mocking Guidelines
```typescript
// Mock external dependencies
jest.mock('@/lib/conversation-manager');

// Mock API calls
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

### Best Practices

#### 1. Test Naming
- Use descriptive test names that explain the behavior
- Follow pattern: `should [expected behavior] when [condition]`

#### 2. Test Organization
- Group related tests with `describe` blocks
- Use `beforeEach` for common setup
- Keep tests focused and isolated

#### 3. Assertions
- Use specific matchers (`toHaveLength`, `toContain`, etc.)
- Test both positive and negative cases
- Verify side effects and state changes

#### 4. Async Testing
```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Expected text')).toBeInTheDocument();
});

// Use resolves/rejects for promises
await expect(asyncFunction()).resolves.toBe(expectedValue);
await expect(asyncFunction()).rejects.toThrow('Expected error');
```

## Test Environment Setup

### Required Dependencies
```json
{
  "@testing-library/jest-dom": "^6.1.4",
  "@testing-library/react": "^16.0.0",
  "@testing-library/user-event": "^14.5.1",
  "jest": "30.0.5",
  "jest-environment-jsdom": "^30.0.5",
  "ts-jest": "29.4.0"
}
```

### Configuration Files
- **Jest Config**: `config/jest.config.js`
- **Jest Setup**: `config/jest.setup.js`
- **TypeScript**: Configured for test files

## Debugging Tests

### Common Issues
1. **Component Not Rendering**: Check jsdom environment
2. **Async Issues**: Use proper waitFor/async patterns
3. **Mock Issues**: Verify mock setup and clearing
4. **Import Errors**: Check module path mapping

### Debugging Commands
```bash
npm test -- --verbose           # Detailed output
npm test -- --no-cache          # Clear Jest cache
npm test -- --detectOpenHandles # Find memory leaks
npm test -- --runInBand         # Run tests serially
```

## Performance Testing

### Response Time Validation
```typescript
it('should respond within acceptable time limits', async () => {
  const startTime = Date.now();
  await performAction();
  const responseTime = Date.now() - startTime;
  
  expect(responseTime).toBeLessThan(3000); // 3 second limit
});
```

### Memory Usage Testing
```typescript
it('should not leak memory', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Perform operations
  for (let i = 0; i < 100; i++) {
    await performOperation();
  }
  
  // Force garbage collection if available
  if (global.gc) global.gc();
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB limit
});
```

## Test Reporting

### Coverage Reports
```bash
npm run test:coverage
open coverage/lcov-report/index.html  # View HTML coverage report
```

### Test Output
- **Console**: Real-time test results
- **Coverage**: HTML and LCOV reports
- **CI Integration**: JUnit XML format supported

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Tests
  run: |
    npm test -- --coverage --watchAll=false
    npm run test:course-structure
    npm run test:integration
```

### Test Quality Gates
- **Minimum Coverage**: 80% line coverage
- **Critical Path Coverage**: 100%
- **Security Tests**: All must pass
- **Performance Tests**: Response time limits enforced

## Troubleshooting

### Common Test Failures

#### 1. API Key Missing
```
Error: OpenAI API key not found
Solution: Set OPENAI_API_KEY in test environment
```

#### 2. Network Timeouts
```
Error: Timeout exceeded
Solution: Increase timeout or mock network calls
```

#### 3. Component Not Found
```
Error: Unable to find element
Solution: Check test queries and async behavior
```

### Test Environment Issues
- **Node Version**: Ensure Node.js 18+
- **Dependencies**: Run `npm install` after updates
- **Cache**: Clear with `npm test -- --clearCache`
- **Permissions**: Check file system permissions

## Contributing Test Guidelines

### Before Submitting
1. **All Tests Pass**: Run full test suite
2. **Coverage Maintained**: No decrease in coverage
3. **Security Tests**: Add security validations
4. **Documentation**: Update test documentation
5. **Performance**: Verify no performance regressions

### Test Review Checklist
- [ ] Tests are focused and isolated
- [ ] Error cases are covered
- [ ] Async operations properly tested
- [ ] Mocks are appropriate and cleaned up
- [ ] Test names are descriptive
- [ ] Documentation is updated

---

## Quality Metrics

- **Total Tests**: 100+
- **Coverage Target**: 80%+ overall, 100% critical path
- **Performance**: <3s response times, <10ms greetings
- **Security**: All 22 vulnerability types protected
- **Reliability**: <1% flaky test rate