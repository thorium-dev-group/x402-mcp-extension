import 'reflect-metadata';
import { 
  MCPResource, 
  isMCPResource, 
  getMCPResourceOptions,
  METADATA_KEY_MCP_RESOURCE,
  MCPResourceOptions 
} from '../../../src/server/decorators/mcpResource';
import { clearGlobalRegistry } from '../../../src/server/decorators/registry';

// Mock the registry to avoid side effects
jest.mock('../../../src/server/decorators/registry', () => ({
  registerHandler: jest.fn(),
  getAllRegisteredHandlers: jest.fn(),
  clearGlobalRegistry: jest.fn()
}));

describe('MCPResource Decorator', () => {
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
    MCPResource({ 
      name: 'test-resource',
      uri: 'test://resource',
      template: 'test-template',
      description: 'Test resource description',
      mimeType: 'application/json',
      title: 'Test Resource'
    })(testClass.prototype, 'testMethod');

    MCPResource({ 
      name: 'another-resource',
      description: 'Another resource description',
      listCallback: async () => ({ resources: [{ uri: 'test://list' }] }),
      completeCallbacks: {
        variable1: (value: string) => [value, 'option1', 'option2'],
        variable2: async (value: string) => [value, 'async-option1', 'async-option2']
      }
    })(testClass.prototype, 'anotherMethod');
  });

  afterEach(() => {
    clearGlobalRegistry();
  });

  describe('MCPResource Decorator', () => {
    it('should apply metadata to decorated methods', () => {
      const instance = new testClass();
      
      // Check that metadata is applied
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_RESOURCE, instance.testMethod)).toBe(true);
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_RESOURCE, instance.anotherMethod)).toBe(true);
      
      // Check that metadata is NOT applied to non-decorated methods
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_RESOURCE, instance.plainMethod)).toBe(false);
    });

    it('should store correct options in metadata', () => {
      const instance = new testClass();
      
      const testMethodOptions = Reflect.getMetadata(METADATA_KEY_MCP_RESOURCE, instance.testMethod);
      expect(testMethodOptions).toEqual({
        name: 'test-resource',
        uri: 'test://resource',
        template: 'test-template',
        description: 'Test resource description',
        mimeType: 'application/json',
        title: 'Test Resource'
      });

      const anotherMethodOptions = Reflect.getMetadata(METADATA_KEY_MCP_RESOURCE, instance.anotherMethod);
      expect(anotherMethodOptions).toEqual({
        name: 'another-resource',
        description: 'Another resource description',
        listCallback: expect.any(Function),
        completeCallbacks: {
          variable1: expect.any(Function),
          variable2: expect.any(Function)
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

      MCPResource({ name: 'minimal-resource' })(
        TestClassWithMinimalOptions.prototype, 
        'minimalMethod'
      );

      const instance = new TestClassWithMinimalOptions();
      const options = Reflect.getMetadata(METADATA_KEY_MCP_RESOURCE, instance.minimalMethod);
      expect(options).toEqual({
        name: 'minimal-resource'
      });
    });

    it('should handle complex callbacks', () => {
      const mockListCallback = jest.fn().mockResolvedValue({ 
        resources: [{ uri: 'test://complex' }] 
      });
      
      const mockCompleteCallback = jest.fn().mockReturnValue(['option1', 'option2']);

      class TestClassWithComplexCallbacks {
        complexMethod() {}
      }

      MCPResource({
        name: 'complex-resource',
        description: 'Complex resource with callbacks',
        listCallback: mockListCallback,
        completeCallbacks: {
          testVariable: mockCompleteCallback
        }
      })(
        TestClassWithComplexCallbacks.prototype,
        'complexMethod'
      );

      const instance = new TestClassWithComplexCallbacks();
      const options = Reflect.getMetadata(METADATA_KEY_MCP_RESOURCE, instance.complexMethod);
      expect(options).toEqual({
        name: 'complex-resource',
        description: 'Complex resource with callbacks',
        listCallback: mockListCallback,
        completeCallbacks: {
          testVariable: mockCompleteCallback
        }
      });
    });

    it('should handle template resources', () => {
      class TestClassWithTemplate {
        templateMethod() {}
      }

      MCPResource({
        name: 'template-resource',
        template: 'test://template/{variable}',
        completeCallbacks: {
          variable: (value: string) => [value, 'default', 'custom']
        }
      })(
        TestClassWithTemplate.prototype,
        'templateMethod'
      );

      const instance = new TestClassWithTemplate();
      const options = Reflect.getMetadata(METADATA_KEY_MCP_RESOURCE, instance.templateMethod);
      expect(options).toEqual({
        name: 'template-resource',
        template: 'test://template/{variable}',
        completeCallbacks: {
          variable: expect.any(Function)
        }
      });
    });
  });

  describe('isMCPResource Utility', () => {
    it('should return true for decorated methods', () => {
      const instance = new testClass();
      
      expect(isMCPResource(instance, 'testMethod')).toBe(true);
      expect(isMCPResource(instance, 'anotherMethod')).toBe(true);
    });

    it('should return false for non-decorated methods', () => {
      const instance = new testClass();
      
      expect(isMCPResource(instance, 'plainMethod')).toBe(false);
    });

    it('should return false for non-existent methods', () => {
      const instance = new testClass();
      
      expect(isMCPResource(instance, 'nonExistentMethod')).toBe(false);
    });

    it('should work with symbol property keys', () => {
      const testSymbol = Symbol('test');
      
      class TestClassWithSymbol {
        [testSymbol]() {}
      }

      MCPResource({ name: 'symbol-resource' })(
        TestClassWithSymbol.prototype,
        testSymbol
      );

      const instance = new TestClassWithSymbol();
      expect(isMCPResource(instance, testSymbol)).toBe(true);
    });
  });

  describe('getMCPResourceOptions Utility', () => {
    it('should return options for decorated methods', () => {
      const instance = new testClass();
      
      const testMethodOptions = getMCPResourceOptions(instance, 'testMethod');
      expect(testMethodOptions).toEqual({
        name: 'test-resource',
        uri: 'test://resource',
        template: 'test-template',
        description: 'Test resource description',
        mimeType: 'application/json',
        title: 'Test Resource'
      });

      const anotherMethodOptions = getMCPResourceOptions(instance, 'anotherMethod');
      expect(anotherMethodOptions).toEqual({
        name: 'another-resource',
        description: 'Another resource description',
        listCallback: expect.any(Function),
        completeCallbacks: {
          variable1: expect.any(Function),
          variable2: expect.any(Function)
        }
      });
    });

    it('should return undefined for non-decorated methods', () => {
      const instance = new testClass();
      
      expect(getMCPResourceOptions(instance, 'plainMethod')).toBeUndefined();
    });

    it('should return undefined for non-existent methods', () => {
      const instance = new testClass();
      
      expect(getMCPResourceOptions(instance, 'nonExistentMethod')).toBeUndefined();
    });

    it('should work with symbol property keys', () => {
      const testSymbol = Symbol('test');
      
      class TestClassWithSymbol {
        [testSymbol]() {}
      }

      MCPResource({ name: 'symbol-resource', description: 'Symbol test' })(
        TestClassWithSymbol.prototype,
        testSymbol
      );

      const instance = new TestClassWithSymbol();
      const options = getMCPResourceOptions(instance, testSymbol);
      expect(options).toEqual({
        name: 'symbol-resource',
        description: 'Symbol test'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options object', () => {
      class TestClassWithEmptyOptions {
        testMethod() {}
      }

      MCPResource({} as MCPResourceOptions)(
        TestClassWithEmptyOptions.prototype,
        'testMethod'
      );

      const instance = new TestClassWithEmptyOptions();
      const options = getMCPResourceOptions(instance, 'testMethod');
      expect(options).toEqual({});
    });

    it('should handle null and undefined values in options', () => {
      class TestClassWithNullOptions {
        testMethod() {}
      }

      MCPResource({
        name: 'test-resource',
        uri: undefined,
        template: undefined,
        description: undefined,
        mimeType: undefined,
        title: undefined,
        listCallback: undefined,
        completeCallbacks: undefined,
        _meta: undefined
      } as MCPResourceOptions)(
        TestClassWithNullOptions.prototype,
        'testMethod'
      );

      const instance = new TestClassWithNullOptions();
      const options = getMCPResourceOptions(instance, 'testMethod');
      expect(options).toEqual({
        name: 'test-resource',
        uri: undefined,
        template: undefined,
        description: undefined,
        mimeType: undefined,
        title: undefined,
        listCallback: undefined,
        completeCallbacks: undefined,
        _meta: undefined
      });
    });

    it('should handle multiple decorators on the same method', () => {
      // Note: This test documents the behavior when multiple decorators are applied
      // The last decorator's metadata will overwrite the previous ones
      class TestClassWithMultipleDecorators {
        testMethod() {}
      }

      MCPResource({ name: 'first-resource' })(
        TestClassWithMultipleDecorators.prototype,
        'testMethod'
      );

      MCPResource({ name: 'second-resource', description: 'Overwritten' })(
        TestClassWithMultipleDecorators.prototype,
        'testMethod'
      );

      const instance = new TestClassWithMultipleDecorators();
      const options = getMCPResourceOptions(instance, 'testMethod');
      expect(options).toEqual({
        name: 'second-resource',
        description: 'Overwritten'
      });
    });
  });

  describe('Integration with Reflect Metadata', () => {
    it('should use the correct metadata key', () => {
      const instance = new testClass();
      
      // Verify the metadata key is used correctly
      expect(Reflect.hasMetadata(METADATA_KEY_MCP_RESOURCE, instance.testMethod)).toBe(true);
      expect(Reflect.getMetadataKeys(instance.testMethod)).toContain(METADATA_KEY_MCP_RESOURCE);
    });

    it('should preserve metadata across instances', () => {
      const instance1 = new testClass();
      const instance2 = new testClass();
      
      // Metadata should be preserved on the prototype/method itself, not the instance
      expect(isMCPResource(instance1, 'testMethod')).toBe(true);
      expect(isMCPResource(instance2, 'testMethod')).toBe(true);
      
      const options1 = getMCPResourceOptions(instance1, 'testMethod');
      const options2 = getMCPResourceOptions(instance2, 'testMethod');
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

      MCPResource({ name: 'registry-test' })(
        TestClassForRegistry.prototype,
        'registryMethod'
      );

      // Verify that registerHandler was called
      expect(mockRegisterHandler).toHaveBeenCalledWith({
        target: TestClassForRegistry.prototype,
        propertyKey: 'registryMethod',
        resourceOptions: { name: 'registry-test' }
      });
    });
  });

  describe('Callback Functionality', () => {
    it('should handle async list callbacks', async () => {
      const asyncListCallback = jest.fn().mockResolvedValue({
        resources: [
          { uri: 'test://async1' },
          { uri: 'test://async2' }
        ]
      });

      class TestClassWithAsyncCallback {
        asyncMethod() {}
      }

      MCPResource({
        name: 'async-resource',
        listCallback: asyncListCallback
      })(
        TestClassWithAsyncCallback.prototype,
        'asyncMethod'
      );

      const instance = new TestClassWithAsyncCallback();
      const options = getMCPResourceOptions(instance, 'asyncMethod');
      
      expect(options).toBeDefined();
      expect(options!.listCallback).toBe(asyncListCallback);
      
      // Test the callback
      const result = await options!.listCallback!({ extra: 'data' });
      expect(result).toEqual({
        resources: [
          { uri: 'test://async1' },
          { uri: 'test://async2' }
        ]
      });
      expect(asyncListCallback).toHaveBeenCalledWith({ extra: 'data' });
    });

    it('should handle sync complete callbacks', () => {
      const syncCompleteCallback = jest.fn().mockReturnValue(['option1', 'option2']);

      class TestClassWithSyncCallback {
        syncMethod() {}
      }

      MCPResource({
        name: 'sync-resource',
        completeCallbacks: {
          testVar: syncCompleteCallback
        }
      })(
        TestClassWithSyncCallback.prototype,
        'syncMethod'
      );

      const instance = new TestClassWithSyncCallback();
      const options = getMCPResourceOptions(instance, 'syncMethod');
      
      expect(options).toBeDefined();
      expect(options!.completeCallbacks!.testVar).toBe(syncCompleteCallback);
      
      // Test the callback
      const result = options!.completeCallbacks!.testVar('test-value', { arguments: { arg1: 'value1' } });
      expect(result).toEqual(['option1', 'option2']);
      expect(syncCompleteCallback).toHaveBeenCalledWith('test-value', { arguments: { arg1: 'value1' } });
    });
  });
}); 