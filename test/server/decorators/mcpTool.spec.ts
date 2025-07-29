import 'reflect-metadata';
import { z } from 'zod';
import { 
  MCPTool, 
  isMCPTool, 
  getMCPToolOptions,
  METADATA_KEY_MCP_TOOL,
  MCPToolOptions 
} from '../../../src/server/decorators/mcpTool';
import { clearGlobalRegistry } from '../../../src/server/decorators/registry';

// Mock the registry to avoid side effects
jest.mock('../../../src/server/decorators/registry', () => ({
  registerHandler: jest.fn(),
  getAllRegisteredHandlers: jest.fn(),
  clearGlobalRegistry: jest.fn()
}));

describe('MCPTool Decorator', () => {
  let testClass: any;

  beforeEach(() => {
    // Clear any existing registry
    clearGlobalRegistry();
    
    // Create a fresh test class for each test
    testClass = class TestClass {
      testMethod() {
        return 'test';
      }

      anotherMethod() {
        return 'another';
      }

      // Method without decorator
      plainMethod() {
        return 'plain';
      }
    };

    // Apply decorators manually for testing
    MCPTool({ 
      name: 'test-tool',
      description: 'Test tool description',
      inputSchema: { input: z.string() },
      outputSchema: z.string()
    })(testClass.prototype, 'testMethod', Object.getOwnPropertyDescriptor(testClass.prototype, 'testMethod')!);

    MCPTool({ 
      name: 'another-tool',
      description: 'Another tool description',
      annotations: {
        title: 'Another Tool',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    })(testClass.prototype, 'anotherMethod', Object.getOwnPropertyDescriptor(testClass.prototype, 'anotherMethod')!);
  });

  afterEach(() => {
    clearGlobalRegistry();
  });

  describe('MCPTool Decorator', () => {
    it('should apply metadata to decorated methods', () => {
      const instance = new testClass();
      
      // Check that metadata is applied
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_TOOL, instance.testMethod)).toBe(true);
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_TOOL, instance.anotherMethod)).toBe(true);
      
      // Check that metadata is NOT applied to non-decorated methods
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_TOOL, instance.plainMethod)).toBe(false);
    });

    it('should store correct options in metadata', () => {
      const instance = new testClass();
      
      const testMethodOptions = Reflect.getMetadata(METADATA_KEY_MCP_TOOL, instance.testMethod);
      expect(testMethodOptions).toMatchObject({
        name: 'test-tool',
        description: 'Test tool description'
      });
      expect(testMethodOptions.inputSchema).toBeDefined();
      expect(testMethodOptions.inputSchema.input).toBeDefined();
      expect(testMethodOptions.outputSchema).toBeDefined();

      const anotherMethodOptions = Reflect.getMetadata(METADATA_KEY_MCP_TOOL, instance.anotherMethod);
      expect(anotherMethodOptions).toEqual({
        name: 'another-tool',
        description: 'Another tool description',
        annotations: {
          title: 'Another Tool',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      });
    });

    it('should preserve method functionality', () => {
      const instance = new testClass();
      
      expect(instance.testMethod()).toBe('test');
      expect(instance.anotherMethod()).toBe('another');
      expect(instance.plainMethod()).toBe('plain');
    });

    it('should handle minimal options', () => {
      class TestClassWithMinimalOptions {
        minimalMethod() {}
      }

      MCPTool({ name: 'minimal-tool' })(
        TestClassWithMinimalOptions.prototype, 
        'minimalMethod', 
        Object.getOwnPropertyDescriptor(TestClassWithMinimalOptions.prototype, 'minimalMethod')!
      );

      const instance = new TestClassWithMinimalOptions();
      const options = Reflect.getMetadata(METADATA_KEY_MCP_TOOL, instance.minimalMethod);
      expect(options).toEqual({
        name: 'minimal-tool'
      });
    });

    it('should handle complex schemas', () => {
      const complexInputSchema = {
        user: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().email()
        }),
        settings: z.object({
          theme: z.enum(['light', 'dark']),
          notifications: z.boolean()
        })
      };

      const complexOutputSchema = z.object({
        success: z.boolean(),
        data: z.any(),
        timestamp: z.string()
      });

      class TestClassWithComplexSchemas {
        complexMethod() {}
      }

      MCPTool({
        name: 'complex-tool',
        description: 'Complex tool with schemas',
        inputSchema: complexInputSchema,
        outputSchema: complexOutputSchema
      })(
        TestClassWithComplexSchemas.prototype,
        'complexMethod',
        Object.getOwnPropertyDescriptor(TestClassWithComplexSchemas.prototype, 'complexMethod')!
      );

      const instance = new TestClassWithComplexSchemas();
      const options = Reflect.getMetadata(METADATA_KEY_MCP_TOOL, instance.complexMethod);
      expect(options).toEqual({
        name: 'complex-tool',
        description: 'Complex tool with schemas',
        inputSchema: complexInputSchema,
        outputSchema: complexOutputSchema
      });
    });
  });

  describe('isMCPTool Utility', () => {
    it('should return true for decorated methods', () => {
      const instance = new testClass();
      
      expect(isMCPTool(instance, 'testMethod')).toBe(true);
      expect(isMCPTool(instance, 'anotherMethod')).toBe(true);
    });

    it('should return false for non-decorated methods', () => {
      const instance = new testClass();
      
      expect(isMCPTool(instance, 'plainMethod')).toBe(false);
    });

    it('should return false for non-existent methods', () => {
      const instance = new testClass();
      
      expect(isMCPTool(instance, 'nonExistentMethod')).toBe(false);
    });

    it('should work with symbol property keys', () => {
      const testSymbol = Symbol('test');
      
      class TestClassWithSymbol {
        [testSymbol]() {}
      }

      MCPTool({ name: 'symbol-tool' })(
        TestClassWithSymbol.prototype,
        testSymbol,
        Object.getOwnPropertyDescriptor(TestClassWithSymbol.prototype, testSymbol)!
      );

      const instance = new TestClassWithSymbol();
      expect(isMCPTool(instance, testSymbol)).toBe(true);
    });
  });

  describe('getMCPToolOptions Utility', () => {
    it('should return options for decorated methods', () => {
      const instance = new testClass();
      
      const testMethodOptions = getMCPToolOptions(instance, 'testMethod');
      expect(testMethodOptions).toMatchObject({
        name: 'test-tool',
        description: 'Test tool description'
      });
      expect(testMethodOptions?.inputSchema).toBeDefined();
      expect(testMethodOptions?.inputSchema?.input).toBeDefined();
      expect(testMethodOptions?.outputSchema).toBeDefined();

      const anotherMethodOptions = getMCPToolOptions(instance, 'anotherMethod');
      expect(anotherMethodOptions).toEqual({
        name: 'another-tool',
        description: 'Another tool description',
        annotations: {
          title: 'Another Tool',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      });
    });

    it('should return undefined for non-decorated methods', () => {
      const instance = new testClass();
      
      expect(getMCPToolOptions(instance, 'plainMethod')).toBeUndefined();
    });

    it('should return undefined for non-existent methods', () => {
      const instance = new testClass();
      
      expect(getMCPToolOptions(instance, 'nonExistentMethod')).toBeUndefined();
    });

    it('should work with symbol property keys', () => {
      const testSymbol = Symbol('test');
      
      class TestClassWithSymbol {
        [testSymbol]() {}
      }

      MCPTool({ name: 'symbol-tool', description: 'Symbol test' })(
        TestClassWithSymbol.prototype,
        testSymbol,
        Object.getOwnPropertyDescriptor(TestClassWithSymbol.prototype, testSymbol)!
      );

      const instance = new TestClassWithSymbol();
      const options = getMCPToolOptions(instance, testSymbol);
      expect(options).toEqual({
        name: 'symbol-tool',
        description: 'Symbol test'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options object', () => {
      class TestClassWithEmptyOptions {
        testMethod() {}
      }

      MCPTool({} as MCPToolOptions)(
        TestClassWithEmptyOptions.prototype,
        'testMethod',
        Object.getOwnPropertyDescriptor(TestClassWithEmptyOptions.prototype, 'testMethod')!
      );

      const instance = new TestClassWithEmptyOptions();
      const options = getMCPToolOptions(instance, 'testMethod');
      expect(options).toEqual({});
    });

    it('should handle null and undefined values in options', () => {
      class TestClassWithNullOptions {
        testMethod() {}
      }

      MCPTool({
        name: 'test-tool',
        description: undefined,
        inputSchema: undefined,
        outputSchema: undefined,
        annotations: undefined,
        _meta: undefined
      } as MCPToolOptions)(
        TestClassWithNullOptions.prototype,
        'testMethod',
        Object.getOwnPropertyDescriptor(TestClassWithNullOptions.prototype, 'testMethod')!
      );

      const instance = new TestClassWithNullOptions();
      const options = getMCPToolOptions(instance, 'testMethod');
      expect(options).toEqual({
        name: 'test-tool',
        description: undefined,
        inputSchema: undefined,
        outputSchema: undefined,
        annotations: undefined,
        _meta: undefined
      });
    });

    it('should handle multiple decorators on the same method', () => {
      // Note: This test documents the behavior when multiple decorators are applied
      // The last decorator's metadata will overwrite the previous ones
      class TestClassWithMultipleDecorators {
        testMethod() {}
      }

      MCPTool({ name: 'first-tool' })(
        TestClassWithMultipleDecorators.prototype,
        'testMethod',
        Object.getOwnPropertyDescriptor(TestClassWithMultipleDecorators.prototype, 'testMethod')!
      );

      MCPTool({ name: 'second-tool', description: 'Overwritten' })(
        TestClassWithMultipleDecorators.prototype,
        'testMethod',
        Object.getOwnPropertyDescriptor(TestClassWithMultipleDecorators.prototype, 'testMethod')!
      );

      const instance = new TestClassWithMultipleDecorators();
      const options = getMCPToolOptions(instance, 'testMethod');
      expect(options).toEqual({
        name: 'second-tool',
        description: 'Overwritten'
      });
    });
  });

  describe('Integration with Reflect Metadata', () => {
    it('should use the correct metadata key', () => {
      const instance = new testClass();
      
      // Verify the metadata key is used correctly
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_TOOL, instance.testMethod)).toBe(true);
      expect(Reflect.getMetadataKeys(instance.testMethod)).toContain(METADATA_KEY_MCP_TOOL);
    });

    it('should preserve metadata across instances', () => {
      const instance1 = new testClass();
      const instance2 = new testClass();
      
      // Metadata should be preserved on the prototype/method itself, not the instance
      expect(isMCPTool(instance1, 'testMethod')).toBe(true);
      expect(isMCPTool(instance2, 'testMethod')).toBe(true);
      
      const options1 = getMCPToolOptions(instance1, 'testMethod');
      const options2 = getMCPToolOptions(instance2, 'testMethod');
      expect(options1).toEqual(options2);
    });
  });

  describe('Registry Integration', () => {
    it('should call registerHandler when decorator is applied', () => {
      // This test verifies that the decorator calls the registry
      // The actual registration is mocked, but we can verify the decorator structure
      class TestClassForRegistry {
        registryMethod() {}
      }

      const mockRegisterHandler = require('../../../src/server/decorators/registry').registerHandler;
      mockRegisterHandler.mockClear();

      MCPTool({ name: 'registry-test' })(
        TestClassForRegistry.prototype,
        'registryMethod',
        Object.getOwnPropertyDescriptor(TestClassForRegistry.prototype, 'registryMethod')!
      );

      // Verify that registerHandler was called
      expect(mockRegisterHandler).toHaveBeenCalledWith({
        target: TestClassForRegistry.prototype,
        propertyKey: 'registryMethod',
        toolOptions: { name: 'registry-test' }
      });
    });
  });
}); 