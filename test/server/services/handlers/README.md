# Handler Services Test Suite

This directory contains comprehensive unit tests for the handler services in the x402 MCP extension.

## Test Files

### 1. Handler Registry (`handler-registry.spec.ts`)
Tests the `HandlerRegistry` class which manages the registration of decorated handlers with the MCP server.

**Features Tested:**
- Handler registration with different types (tool, prompt, resource, resourceTemplate)
- Service container integration
- Error handling for missing services
- Payment orchestrator integration
- Server registration methods

**Key Test Cases:**
- Successful handler registration
- Error handling when service container not initialized
- Registration of different handler types
- Context with/without payment orchestrator
- Empty handler list handling

### 2. Handler Discovery Service (`handler-discovery-service.spec.ts`)
Tests the `HandlerDiscoveryService` singleton that discovers and processes registered handlers.

**Features Tested:**
- Singleton pattern implementation
- Handler discovery and caching
- Payment requirements assembly
- Handler metadata management
- Instance creation and management

**Key Test Cases:**
- Singleton instance management
- Handler discovery with different types
- Payment requirements caching
- Handler metadata storage
- Error handling for payment assembly
- Symbol property key handling

### 3. Handler Wrapper Factory (`handler-wrapper-factory.spec.ts`)
Tests the `HandlerWrapperFactory` that creates wrapped handlers with payment orchestration.

**Features Tested:**
- Wrapped handler creation for all types
- Payment orchestration integration
- Schema-based vs non-schema tool handling
- Error handling in wrapped handlers
- Service integration (facilitator, payment orchestrator)

**Key Test Cases:**
- Tool handler wrapping (with/without schema)
- Prompt handler wrapping
- Resource handler wrapping
- Resource template handler wrapping
- Payment orchestration when requirements provided
- Error propagation from wrapped handlers

### 4. Handler Wrapper Utils (`handler-wrapper-utils.spec.ts`)
Tests the `HandlerWrapperUtils` utility class for common handler operations.

**Features Tested:**
- Handler name extraction
- Handler type determination
- Handler option validation
- Instance finding and creation
- Error handling for invalid configurations

**Key Test Cases:**
- Handler name extraction from different option types
- Handler type determination logic
- Validation of handler options
- Instance finding in global scope
- Constructor-based instance creation
- Error handling for invalid handlers

### 5. Payment Utils (`payment-utils.spec.ts`)
Tests the `assemblePaymentRequirements` function that converts decorator options to full payment requirements.

**Features Tested:**
- Payment requirements assembly
- Resource URL construction
- Network-specific processing
- Error handling for invalid amounts
- Additional option handling

**Key Test Cases:**
- Basic payment requirements assembly
- Resource URL construction with base URL
- Different network support
- Error handling for price processing
- Edge cases (zero amounts, large amounts)
- Complex resource paths

## Test Infrastructure

### Mocking Strategy
- **Dependencies**: All external dependencies are mocked to ensure isolation
- **Services**: Service container and payment orchestrator are mocked
- **Registry**: Global registry functions are mocked
- **Cache**: Cache managers are mocked for testing
- **Network**: x402 shared functions are mocked

### Test Patterns
- **Isolation**: Each test uses fresh mocks and instances
- **Singleton Testing**: Proper cleanup of singleton instances
- **Error Handling**: Comprehensive error scenario testing
- **Edge Cases**: Null/undefined handling and boundary conditions
- **Type Safety**: Proper TypeScript type checking

## Running Tests

```bash
# Run all handler service tests
npm test -- test/server/services/handlers

# Run specific test files
npm test -- test/server/services/handlers/handler-registry.spec.ts
npm test -- test/server/services/handlers/handler-discovery-service.spec.ts
npm test -- test/server/services/handlers/handler-wrapper-factory.spec.ts
npm test -- test/server/services/handlers/handler-wrapper-utils.spec.ts
npm test -- test/server/services/handlers/payment-utils.spec.ts
```

## Test Coverage

### Handler Registry
- ✅ Handler registration flow
- ✅ Service container integration
- ✅ Error handling
- ✅ Different handler types
- ✅ Context variations

### Handler Discovery Service
- ✅ Singleton pattern
- ✅ Handler discovery
- ✅ Payment requirements
- ✅ Caching behavior
- ✅ Instance management

### Handler Wrapper Factory
- ✅ Wrapped handler creation
- ✅ Payment orchestration
- ✅ Schema handling
- ✅ Error propagation
- ✅ Service integration

### Handler Wrapper Utils
- ✅ Name extraction
- ✅ Type determination
- ✅ Option validation
- ✅ Instance finding
- ✅ Error handling

### Payment Utils
- ✅ Requirements assembly
- ✅ URL construction
- ✅ Network support
- ✅ Error handling
- ✅ Edge cases

## Key Testing Achievements

### 1. Comprehensive Coverage
- All handler service classes tested
- All public methods covered
- Error scenarios handled
- Edge cases covered

### 2. Robust Mocking
- External dependencies properly mocked
- Service interactions tested
- Network calls mocked
- Cache behavior tested

### 3. Type Safety
- TypeScript types properly tested
- Interface compliance verified
- Type errors caught in tests

### 4. Error Handling
- Invalid configurations tested
- Network failures handled
- Service failures tested
- Graceful degradation verified

## Dependencies

- **jest**: Testing framework
- **@types/jest**: TypeScript definitions
- **reflect-metadata**: For decorator testing
- **x402/shared**: Mocked for payment processing
- **@modelcontextprotocol/sdk**: Mocked for MCP server

The test suite provides excellent coverage of the handler services and ensures reliable operation of the x402 MCP extension. 