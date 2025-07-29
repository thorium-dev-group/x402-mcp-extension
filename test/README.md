# Test Suite for X402-MCP Extension

This directory contains comprehensive unit tests for the X402-MCP Extension project.

## Test Structure

```
test/
├── README.md                    # This file
├── setup.ts                     # Jest setup configuration
├── index.ts                     # Test module exports
└── shared/
    └── services/
        ├── InMemoryStorage.spec.ts    # Tests for InMemoryStorage service
        └── PaymentAuditStore.spec.ts  # Tests for PaymentAuditStore service
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test -- InMemoryStorage.spec.ts
```

### Run tests in watch mode
```bash
npm test -- --watch
```

## Test Coverage

### InMemoryStorage Tests
The `InMemoryStorage.spec.ts` file tests the in-memory storage implementation with the following coverage:

- **Singleton Pattern**: Tests the singleton behavior and instance creation
- **Basic Operations**: Tests get, set, has, delete, and clear operations
- **TTL (Time To Live)**: Tests automatic expiration of entries
- **Storage Size Management**: Tests eviction of oldest entries when max size is reached
- **Edge Cases**: Tests special characters, large values, and concurrent operations
- **Error Handling**: Tests graceful handling of edge cases

### PaymentAuditStore Tests
The `PaymentAuditStore.spec.ts` file tests the payment audit storage implementation with the following coverage:

- **storePendingRequest**: Tests storing new pending requests with validation
- **getPendingRequest**: Tests retrieving stored requests
- **markRequestCompleted**: Tests marking requests as completed with status updates
- **updatePaymentStatus**: Tests updating payment status with various details
- **removePendingRequest**: Tests removing pending requests
- **Integration**: Tests integration with real InMemoryStorage
- **Edge Cases**: Tests special characters, large data, and concurrent operations
- **Data Persistence**: Tests JSON serialization and date handling

## Test Configuration

The tests use Jest with the following configuration (from `package.json`):

- **Test Environment**: Node.js
- **File Extensions**: `.js`, `.json`, `.ts`
- **Transform**: TypeScript with `ts-jest`
- **Coverage**: Reports generated in `./coverage` directory
- **Timeout**: 10 seconds per test (configured in `test/setup.ts`)

## Mock Storage

The PaymentAuditStore tests use a `MockStorage` class that implements the `IStorageInterface` to provide controlled testing environment without external dependencies.

## Key Testing Patterns

1. **Isolation**: Each test uses fresh instances to avoid state pollution
2. **Async/Await**: All storage operations are properly awaited
3. **Error Testing**: Tests verify error conditions and edge cases
4. **Integration Testing**: Tests verify compatibility with real storage implementations
5. **Concurrent Operations**: Tests verify thread-safe behavior

## Adding New Tests

When adding new tests:

1. Follow the existing naming convention: `[ServiceName].spec.ts`
2. Place tests in the appropriate directory structure
3. Use descriptive test names that explain the expected behavior
4. Include both positive and negative test cases
5. Test edge cases and error conditions
6. Use the provided mock storage for isolated testing

## Test Dependencies

- **Jest**: Testing framework
- **ts-jest**: TypeScript support for Jest
- **@types/jest**: TypeScript definitions for Jest
- **@modelcontextprotocol/sdk**: For RequestId type

## Coverage Goals

The test suite aims for:
- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: >95%

Run `npm test -- --coverage` to see current coverage metrics. 