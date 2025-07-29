import 'reflect-metadata';
import { MCPTool, isPaymentRequired, getPaymentOptions, MCPToolOptions } from '../../../src/server/decorators/mcpTool';
import { clearGlobalRegistry } from '../../../src/server/decorators/registry';

// Mock the registry to avoid side effects
jest.mock('../../../src/server/decorators/registry', () => ({
  registerHandler: jest.fn(),
  getAllRegisteredHandlers: jest.fn(),
  clearGlobalRegistry: jest.fn()
}));

describe('MCPTool Decorator with Payment Options', () => {
  let testClass: any;
  let instance: any;

  beforeEach(() => {
    // Clear any existing registry
    clearGlobalRegistry();
    
    // Create a test class with methods
    testClass = class TestClass {
      testMethod() {}
      anotherMethod() {}
      plainMethod() {}
    };

    // Apply decorators manually for testing
    MCPTool({ 
      name: 'test-tool',
      description: 'Test tool',
      payment: { amount: 100, description: 'Test payment' }
    })(testClass.prototype, 'testMethod', Object.getOwnPropertyDescriptor(testClass.prototype, 'testMethod')!);

    MCPTool({ 
      name: 'another-tool',
      description: 'Another tool',
      payment: { 
        amount: 200, 
        description: 'Another payment',
        asset: 'ETH',
        assetType: 'erc20'
      }
    })(testClass.prototype, 'anotherMethod', Object.getOwnPropertyDescriptor(testClass.prototype, 'anotherMethod')!);

    MCPTool({ 
      name: 'free-tool',
      description: 'Free tool'
    })(testClass.prototype, 'plainMethod', Object.getOwnPropertyDescriptor(testClass.prototype, 'plainMethod')!);

    instance = new testClass();
  });

  afterEach(() => {
    clearGlobalRegistry();
  });

  describe('MCPTool Decorator with Payment', () => {
    it('should apply payment options to decorated method', () => {
      // Test that the decorator was applied correctly
      expect(isPaymentRequired(testClass.prototype, 'testMethod')).toBe(true);
      expect(isPaymentRequired(testClass.prototype, 'anotherMethod')).toBe(true);
      expect(isPaymentRequired(testClass.prototype, 'plainMethod')).toBe(false);
    });

    it('should retrieve payment options correctly', () => {
      const testMethodOptions = getPaymentOptions(testClass.prototype, 'testMethod');
      expect(testMethodOptions).toEqual({ amount: 100, description: 'Test payment' });

      const anotherMethodOptions = getPaymentOptions(testClass.prototype, 'anotherMethod');
      expect(anotherMethodOptions).toEqual({ 
        amount: 200, 
        description: 'Another payment',
        asset: 'ETH',
        assetType: 'erc20'
      });

      const plainMethodOptions = getPaymentOptions(testClass.prototype, 'plainMethod');
      expect(plainMethodOptions).toBeUndefined();
    });

    it('should handle methods without payment options', () => {
      expect(isPaymentRequired(testClass.prototype, 'plainMethod')).toBe(false);
      expect(getPaymentOptions(testClass.prototype, 'plainMethod')).toBeUndefined();
    });

    it('should handle non-existent methods', () => {
      expect(isPaymentRequired(testClass.prototype, 'nonExistentMethod')).toBe(false);
      expect(getPaymentOptions(testClass.prototype, 'nonExistentMethod')).toBeUndefined();
    });

    it('should work with symbol property keys', () => {
      const testSymbol = Symbol('testSymbol');
      
      class SymbolTestClass {
        [testSymbol]() {}
      }

      MCPTool({ 
        name: 'symbol-tool',
        payment: { amount: 100, description: 'Symbol test' }
      })(SymbolTestClass.prototype, testSymbol, Object.getOwnPropertyDescriptor(SymbolTestClass.prototype, testSymbol)!);

      const symbolInstance = new SymbolTestClass();
      expect(isPaymentRequired(SymbolTestClass.prototype, testSymbol)).toBe(true);
      
      const options = getPaymentOptions(SymbolTestClass.prototype, testSymbol);
      expect(options).toEqual({ amount: 100, description: 'Symbol test' });
    });

    it('should handle edge cases', () => {
      // Test with empty payment options
      class EdgeCaseClass {
        testMethod() {}
      }

      MCPTool({ 
        name: 'edge-tool',
        payment: {} as any
      })(EdgeCaseClass.prototype, 'testMethod', Object.getOwnPropertyDescriptor(EdgeCaseClass.prototype, 'testMethod')!);

      const edgeInstance = new EdgeCaseClass();
      expect(isPaymentRequired(EdgeCaseClass.prototype, 'testMethod')).toBe(true);
      
      const options = getPaymentOptions(EdgeCaseClass.prototype, 'testMethod');
      expect(options).toEqual({});
    });

    it('should handle complex payment options', () => {
      class ComplexClass {
        testMethod() {}
      }

      MCPTool({ 
        name: 'complex-tool',
        payment: {
          amount: 500,
          description: 'Complex payment',
          asset: 'USDC',
          assetType: 'erc20',
          paymentAddress: '0x1234567890123456789012345678901234567890',
          network: 'ethereum'
        }
      })(ComplexClass.prototype, 'testMethod', Object.getOwnPropertyDescriptor(ComplexClass.prototype, 'testMethod')!);

      const complexInstance = new ComplexClass();
      const options = getPaymentOptions(ComplexClass.prototype, 'testMethod');
      expect(options).toEqual({
        amount: 500,
        description: 'Complex payment',
        asset: 'USDC',
        assetType: 'erc20',
        paymentAddress: '0x1234567890123456789012345678901234567890',
        network: 'ethereum'
      });
    });

    it('should handle decorator overwriting', () => {
      // Apply decorator multiple times to same method
      MCPTool({ 
        name: 'overwrite-tool',
        payment: { amount: 100 }
      })(testClass.prototype, 'testMethod', Object.getOwnPropertyDescriptor(testClass.prototype, 'testMethod')!);

      MCPTool({ 
        name: 'overwrite-tool-2',
        payment: { amount: 200, description: 'Overwritten' }
      })(testClass.prototype, 'testMethod', Object.getOwnPropertyDescriptor(testClass.prototype, 'testMethod')!);

      const options = getPaymentOptions(testClass.prototype, 'testMethod');
      expect(options).toEqual({ amount: 200, description: 'Overwritten' });
    });

    it('should maintain separate instances', () => {
      const instance1 = new testClass();
      const instance2 = new testClass();

      // Both instances should have the same metadata
      expect(isPaymentRequired(testClass.prototype, 'testMethod')).toBe(true);
      expect(isPaymentRequired(testClass.prototype, 'testMethod')).toBe(true);

      const options1 = getPaymentOptions(testClass.prototype, 'testMethod');
      const options2 = getPaymentOptions(testClass.prototype, 'testMethod');
      expect(options1).toEqual(options2);
    });
  });
}); 