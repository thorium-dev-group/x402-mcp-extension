import 'reflect-metadata';
import { z } from 'zod';
import { 
  MCPPrompt, 
  isMCPPrompt, 
  getMCPPromptOptions,
  METADATA_KEY_MCP_PROMPT,
  MCPPromptOptions 
} from '../../../src/server/decorators/mcpPrompt';
import { clearGlobalRegistry } from '../../../src/server/decorators/registry';

// Mock the registry to avoid side effects
jest.mock('../../../src/server/decorators/registry', () => ({
  registerHandler: jest.fn(),
  getAllRegisteredHandlers: jest.fn(),
  clearGlobalRegistry: jest.fn()
}));

describe('MCPPrompt Decorator', () => {
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
    MCPPrompt({ 
      name: 'test-prompt',
      description: 'Test prompt description',
      argsSchema: { input: z.string() },
      title: 'Test Prompt'
    })(testClass.prototype, 'testMethod');

    MCPPrompt({ 
      name: 'another-prompt',
      description: 'Another prompt description',
      title: 'Another Prompt'
    })(testClass.prototype, 'anotherMethod');
  });

  afterEach(() => {
    clearGlobalRegistry();
  });

  describe('MCPPrompt Decorator', () => {
    it('should apply metadata to decorated methods', () => {
      const instance = new testClass();
      
      // Check that metadata is applied
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_PROMPT, instance.testMethod)).toBe(true);
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_PROMPT, instance.anotherMethod)).toBe(true);
      
      // Check that metadata is NOT applied to non-decorated methods
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_PROMPT, instance.plainMethod)).toBe(false);
    });

    it('should store correct options in metadata', () => {
      const instance = new testClass();
      
      const testMethodOptions = Reflect.getMetadata(METADATA_KEY_MCP_PROMPT, instance.testMethod);
      expect(testMethodOptions).toMatchObject({
        name: 'test-prompt',
        description: 'Test prompt description',
        title: 'Test Prompt'
      });
      expect(testMethodOptions.argsSchema).toBeDefined();
      expect(testMethodOptions.argsSchema.input).toBeDefined();

      const anotherMethodOptions = Reflect.getMetadata(METADATA_KEY_MCP_PROMPT, instance.anotherMethod);
      expect(anotherMethodOptions).toEqual({
        name: 'another-prompt',
        description: 'Another prompt description',
        title: 'Another Prompt'
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

      MCPPrompt({ name: 'minimal-prompt' })(
        TestClassWithMinimalOptions.prototype, 
        'minimalMethod'
      );

      const instance = new TestClassWithMinimalOptions();
      const options = Reflect.getMetadata(METADATA_KEY_MCP_PROMPT, instance.minimalMethod);
      expect(options).toEqual({
        name: 'minimal-prompt'
      });
    });

    it('should handle complex schemas', () => {
      const complexArgsSchema = {
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

      class TestClassWithComplexSchemas {
        complexMethod() {}
      }

      MCPPrompt({
        name: 'complex-prompt',
        description: 'Complex prompt with schemas',
        argsSchema: complexArgsSchema,
        title: 'Complex Prompt'
      })(
        TestClassWithComplexSchemas.prototype,
        'complexMethod'
      );

      const instance = new TestClassWithComplexSchemas();
      const options = Reflect.getMetadata(METADATA_KEY_MCP_PROMPT, instance.complexMethod);
      expect(options).toEqual({
        name: 'complex-prompt',
        description: 'Complex prompt with schemas',
        argsSchema: complexArgsSchema,
        title: 'Complex Prompt'
      });
    });

    it('should handle nested schemas', () => {
      const nestedSchema = {
        request: z.object({
          type: z.string(),
          data: z.object({
            id: z.string(),
            metadata: z.object({
              tags: z.array(z.string()),
              priority: z.number()
            })
          })
        })
      };

      class TestClassWithNestedSchemas {
        nestedMethod() {}
      }

      MCPPrompt({
        name: 'nested-prompt',
        argsSchema: nestedSchema
      })(
        TestClassWithNestedSchemas.prototype,
        'nestedMethod'
      );

      const instance = new TestClassWithNestedSchemas();
      const options = Reflect.getMetadata(METADATA_KEY_MCP_PROMPT, instance.nestedMethod);
      expect(options).toEqual({
        name: 'nested-prompt',
        argsSchema: nestedSchema
      });
    });
  });

  describe('isMCPPrompt Utility', () => {
    it('should return true for decorated methods', () => {
      const instance = new testClass();
      
      expect(isMCPPrompt(instance, 'testMethod')).toBe(true);
      expect(isMCPPrompt(instance, 'anotherMethod')).toBe(true);
    });

    it('should return false for non-decorated methods', () => {
      const instance = new testClass();
      
      expect(isMCPPrompt(instance, 'plainMethod')).toBe(false);
    });

    it('should return false for non-existent methods', () => {
      const instance = new testClass();
      
      expect(isMCPPrompt(instance, 'nonExistentMethod')).toBe(false);
    });

    it('should work with symbol property keys', () => {
      const testSymbol = Symbol('test');
      
      class TestClassWithSymbol {
        [testSymbol]() {}
      }

      MCPPrompt({ name: 'symbol-prompt' })(
        TestClassWithSymbol.prototype,
        testSymbol
      );

      const instance = new TestClassWithSymbol();
      expect(isMCPPrompt(instance, testSymbol)).toBe(true);
    });
  });

  describe('getMCPPromptOptions Utility', () => {
    it('should return options for decorated methods', () => {
      const instance = new testClass();
      
      const testMethodOptions = getMCPPromptOptions(instance, 'testMethod');
      expect(testMethodOptions).toMatchObject({
        name: 'test-prompt',
        description: 'Test prompt description',
        title: 'Test Prompt'
      });
      expect(testMethodOptions?.argsSchema).toBeDefined();
      expect(testMethodOptions?.argsSchema?.input).toBeDefined();

      const anotherMethodOptions = getMCPPromptOptions(instance, 'anotherMethod');
      expect(anotherMethodOptions).toEqual({
        name: 'another-prompt',
        description: 'Another prompt description',
        title: 'Another Prompt'
      });
    });

    it('should return undefined for non-decorated methods', () => {
      const instance = new testClass();
      
      expect(getMCPPromptOptions(instance, 'plainMethod')).toBeUndefined();
    });

    it('should return undefined for non-existent methods', () => {
      const instance = new testClass();
      
      expect(getMCPPromptOptions(instance, 'nonExistentMethod')).toBeUndefined();
    });

    it('should work with symbol property keys', () => {
      const testSymbol = Symbol('test');
      
      class TestClassWithSymbol {
        [testSymbol]() {}
      }

      MCPPrompt({ name: 'symbol-prompt', description: 'Symbol test' })(
        TestClassWithSymbol.prototype,
        testSymbol
      );

      const instance = new TestClassWithSymbol();
      const options = getMCPPromptOptions(instance, testSymbol);
      expect(options).toEqual({
        name: 'symbol-prompt',
        description: 'Symbol test'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options object', () => {
      class TestClassWithEmptyOptions {
        testMethod() {}
      }

      MCPPrompt({} as MCPPromptOptions)(
        TestClassWithEmptyOptions.prototype,
        'testMethod'
      );

      const instance = new TestClassWithEmptyOptions();
      const options = getMCPPromptOptions(instance, 'testMethod');
      expect(options).toEqual({});
    });

    it('should handle null and undefined values in options', () => {
      class TestClassWithNullOptions {
        testMethod() {}
      }

      MCPPrompt({
        name: 'test-prompt',
        description: undefined,
        argsSchema: undefined,
        title: undefined,
        _meta: undefined
      } as MCPPromptOptions)(
        TestClassWithNullOptions.prototype,
        'testMethod'
      );

      const instance = new TestClassWithNullOptions();
      const options = getMCPPromptOptions(instance, 'testMethod');
      expect(options).toEqual({
        name: 'test-prompt',
        description: undefined,
        argsSchema: undefined,
        title: undefined,
        _meta: undefined
      });
    });

    it('should handle multiple decorators on the same method', () => {
      // Note: This test documents the behavior when multiple decorators are applied
      // The last decorator's metadata will overwrite the previous ones
      class TestClassWithMultipleDecorators {
        testMethod() {}
      }

      MCPPrompt({ name: 'first-prompt' })(
        TestClassWithMultipleDecorators.prototype,
        'testMethod'
      );

      MCPPrompt({ name: 'second-prompt', description: 'Overwritten' })(
        TestClassWithMultipleDecorators.prototype,
        'testMethod'
      );

      const instance = new TestClassWithMultipleDecorators();
      const options = getMCPPromptOptions(instance, 'testMethod');
      expect(options).toEqual({
        name: 'second-prompt',
        description: 'Overwritten'
      });
    });
  });

  describe('Integration with Reflect Metadata', () => {
    it('should use the correct metadata key', () => {
      const instance = new testClass();
      
      // Verify the metadata key is used correctly
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_PROMPT, instance.testMethod)).toBe(true);
      expect(Reflect.getMetadataKeys(instance.testMethod)).toContain(METADATA_KEY_MCP_PROMPT);
    });

    it('should preserve metadata across instances', () => {
      const instance1 = new testClass();
      const instance2 = new testClass();
      
      // Metadata should be preserved on the prototype/method itself, not the instance
      expect(isMCPPrompt(instance1, 'testMethod')).toBe(true);
      expect(isMCPPrompt(instance2, 'testMethod')).toBe(true);
      
      const options1 = getMCPPromptOptions(instance1, 'testMethod');
      const options2 = getMCPPromptOptions(instance2, 'testMethod');
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

      MCPPrompt({ name: 'registry-test' })(
        TestClassForRegistry.prototype,
        'registryMethod'
      );

      // Verify that registerHandler was called
      expect(mockRegisterHandler).toHaveBeenCalledWith({
        target: TestClassForRegistry.prototype,
        propertyKey: 'registryMethod',
        promptOptions: { name: 'registry-test' }
      });
    });
  });

  describe('Schema Validation', () => {
    it('should handle zod schema objects correctly', () => {
      const zodSchema = {
        name: z.string(),
        age: z.number().min(0),
        email: z.string().email(),
        preferences: z.object({
          theme: z.enum(['light', 'dark']),
          notifications: z.boolean()
        })
      };

      class TestClassWithZodSchema {
        zodMethod() {}
      }

      MCPPrompt({
        name: 'zod-prompt',
        argsSchema: zodSchema
      })(
        TestClassWithZodSchema.prototype,
        'zodMethod'
      );

      const instance = new TestClassWithZodSchema();
      const options = getMCPPromptOptions(instance, 'zodMethod');
      expect(options).toBeDefined();
      expect(options!.argsSchema).toEqual(zodSchema);
    });

    it('should handle array schemas', () => {
      const arraySchema = {
        items: z.array(z.string()),
        numbers: z.array(z.number()),
        objects: z.array(z.object({
          id: z.string(),
          value: z.number()
        }))
      };

      class TestClassWithArraySchema {
        arrayMethod() {}
      }

      MCPPrompt({
        name: 'array-prompt',
        argsSchema: arraySchema
      })(
        TestClassWithArraySchema.prototype,
        'arrayMethod'
      );

      const instance = new TestClassWithArraySchema();
      const options = getMCPPromptOptions(instance, 'arrayMethod');
      expect(options).toBeDefined();
      expect(options!.argsSchema).toEqual(arraySchema);
    });

    it('should handle union and intersection types', () => {
      const unionSchema = {
        input: z.union([z.string(), z.number()]),
        output: z.intersection(
          z.object({ success: z.boolean() }),
          z.object({ data: z.any() })
        )
      };

      class TestClassWithUnionSchema {
        unionMethod() {}
      }

      MCPPrompt({
        name: 'union-prompt',
        argsSchema: unionSchema
      })(
        TestClassWithUnionSchema.prototype,
        'unionMethod'
      );

      const instance = new TestClassWithUnionSchema();
      const options = getMCPPromptOptions(instance, 'unionMethod');
      expect(options).toBeDefined();
      expect(options!.argsSchema).toEqual(unionSchema);
    });
  });
}); 