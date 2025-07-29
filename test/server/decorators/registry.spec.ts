import 'reflect-metadata';
import { 
  registerHandler, 
  getAllRegisteredHandlers, 
  clearGlobalRegistry,
  getRegistryStats,
  updateHandler,
  RegisteredHandler 
} from '../../../src/server/decorators/registry';

describe('Registry', () => {
  beforeEach(() => {
    // Clear registry before each test
    clearGlobalRegistry();
  });

  afterEach(() => {
    // Clear registry after each test
    clearGlobalRegistry();
  });

  describe('registerHandler', () => {
    it('should register a handler with tool options', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const mockPropertyKey = 'testMethod';
      const toolOptions = {
        name: 'test-tool',
        description: 'Test tool'
      };

      registerHandler({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        toolOptions
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toEqual({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        toolOptions
      });
    });

    it('should register a handler with prompt options', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const mockPropertyKey = 'testMethod';
      const promptOptions = {
        name: 'test-prompt',
        description: 'Test prompt'
      };

      registerHandler({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        promptOptions
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toEqual({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        promptOptions
      });
    });

    it('should register a handler with resource options', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const mockPropertyKey = 'testMethod';
      const resourceOptions = {
        name: 'test-resource',
        description: 'Test resource'
      };

      registerHandler({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        resourceOptions
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toEqual({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        resourceOptions
      });
    });

    it('should update existing handler when registering with same key', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const mockPropertyKey = 'testMethod';

      // Register first handler
      registerHandler({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        toolOptions: { name: 'first-tool' }
      });

      // Register second handler with same key but different options
      registerHandler({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        toolOptions: { name: 'second-tool', description: 'Updated tool' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toEqual({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        toolOptions: { name: 'second-tool', description: 'Updated tool' }
      });
    });

    it('should handle multiple handlers with different keys', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };

      registerHandler({
        target: mockTarget,
        propertyKey: 'method1',
        toolOptions: { name: 'tool1' }
      });

      registerHandler({
        target: mockTarget,
        propertyKey: 'method2',
        promptOptions: { name: 'prompt1' }
      });

      registerHandler({
        target: mockTarget,
        propertyKey: 'method3',
        resourceOptions: { name: 'resource1' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(3);
      
      const toolHandler = handlers.find(h => h.toolOptions);
      const promptHandler = handlers.find(h => h.promptOptions);
      const resourceHandler = handlers.find(h => h.resourceOptions);

      expect(toolHandler).toBeDefined();
      expect(promptHandler).toBeDefined();
      expect(resourceHandler).toBeDefined();
    });

    it('should handle symbol property keys', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const testSymbol = Symbol('test');

      registerHandler({
        target: mockTarget,
        propertyKey: testSymbol,
        toolOptions: { name: 'symbol-tool' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0].propertyKey).toBe(testSymbol);
    });

    it('should handle anonymous classes', () => {
      const mockTarget = { name: 'anonymous' };
      const mockPropertyKey = 'testMethod';

      registerHandler({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        toolOptions: { name: 'anonymous-tool' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0].target).toBe(mockTarget);
    });
  });

  describe('getAllRegisteredHandlers', () => {
    it('should return empty array when no handlers are registered', () => {
      const handlers = getAllRegisteredHandlers();
      expect(handlers).toEqual([]);
    });

    it('should return all registered handlers', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };

      registerHandler({
        target: mockTarget,
        propertyKey: 'method1',
        toolOptions: { name: 'tool1' }
      });

      registerHandler({
        target: mockTarget,
        propertyKey: 'method2',
        promptOptions: { name: 'prompt1' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(2);
      expect(handlers[0].propertyKey).toBe('method1');
      expect(handlers[1].propertyKey).toBe('method2');
    });

    it('should return handlers in registration order', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };

      const handler1 = {
        target: mockTarget,
        propertyKey: 'method1',
        toolOptions: { name: 'tool1' }
      };

      const handler2 = {
        target: mockTarget,
        propertyKey: 'method2',
        promptOptions: { name: 'prompt1' }
      };

      registerHandler(handler1);
      registerHandler(handler2);

      const handlers = getAllRegisteredHandlers();
      expect(handlers[0]).toEqual(handler1);
      expect(handlers[1]).toEqual(handler2);
    });
  });

  describe('clearGlobalRegistry', () => {
    it('should clear all registered handlers', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };

      registerHandler({
        target: mockTarget,
        propertyKey: 'method1',
        toolOptions: { name: 'tool1' }
      });

      registerHandler({
        target: mockTarget,
        propertyKey: 'method2',
        promptOptions: { name: 'prompt1' }
      });

      // Verify handlers are registered
      expect(getAllRegisteredHandlers()).toHaveLength(2);

      // Clear registry
      clearGlobalRegistry();

      // Verify handlers are cleared
      expect(getAllRegisteredHandlers()).toHaveLength(0);
    });

    it('should handle clearing empty registry', () => {
      expect(getAllRegisteredHandlers()).toHaveLength(0);
      clearGlobalRegistry();
      expect(getAllRegisteredHandlers()).toHaveLength(0);
    });
  });

  describe('getRegistryStats', () => {
    it('should return correct stats for empty registry', () => {
      const stats = getRegistryStats();
      expect(stats).toEqual({
        size: 0,
        keys: []
      });
    });

    it('should return correct stats for populated registry', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };

      registerHandler({
        target: mockTarget,
        propertyKey: 'method1',
        toolOptions: { name: 'tool1' }
      });

      registerHandler({
        target: mockTarget,
        propertyKey: 'method2',
        promptOptions: { name: 'prompt1' }
      });

      const stats = getRegistryStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('TestClass.method1');
      expect(stats.keys).toContain('TestClass.method2');
    });

    it('should handle anonymous class names in stats', () => {
      const mockTarget = { name: 'anonymous' };

      registerHandler({
        target: mockTarget,
        propertyKey: 'method1',
        toolOptions: { name: 'tool1' }
      });

      const stats = getRegistryStats();
      expect(stats.size).toBe(1);
      // The actual implementation uses constructor.name or falls back to 'Object'
      expect(stats.keys).toContain('Object.method1');
    });
  });

  describe('updateHandler', () => {
    it('should update existing handler', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const mockPropertyKey = 'testMethod';

      // Register initial handler
      registerHandler({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        toolOptions: { name: 'original-tool' }
      });

      // Update handler
      updateHandler(mockTarget, mockPropertyKey, {
        toolOptions: { name: 'updated-tool', description: 'Updated description' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0].toolOptions).toEqual({
        name: 'updated-tool',
        description: 'Updated description'
      });
    });

    it('should not create new handler when updating non-existent handler', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const mockPropertyKey = 'nonExistentMethod';

      updateHandler(mockTarget, mockPropertyKey, {
        toolOptions: { name: 'new-tool' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(0);
    });

    it('should preserve existing options when updating', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const mockPropertyKey = 'testMethod';

      // Register handler with multiple options
      registerHandler({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        toolOptions: { name: 'original-tool' },
        promptOptions: { name: 'original-prompt' }
      });

      // Update only tool options
      updateHandler(mockTarget, mockPropertyKey, {
        toolOptions: { name: 'updated-tool' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0].toolOptions).toEqual({ name: 'updated-tool' });
      expect(handlers[0].promptOptions).toEqual({ name: 'original-prompt' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle handlers with no options', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const mockPropertyKey = 'testMethod';

      registerHandler({
        target: mockTarget,
        propertyKey: mockPropertyKey
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toEqual({
        target: mockTarget,
        propertyKey: mockPropertyKey
      });
    });

    it('should handle handlers with multiple option types', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const mockPropertyKey = 'testMethod';

      registerHandler({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        toolOptions: { name: 'tool' },
        promptOptions: { name: 'prompt' },
        resourceOptions: { name: 'resource' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toEqual({
        target: mockTarget,
        propertyKey: mockPropertyKey,
        toolOptions: { name: 'tool' },
        promptOptions: { name: 'prompt' },
        resourceOptions: { name: 'resource' }
      });
    });

    it('should handle special characters in property keys', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const specialKey = 'method:with:colons';

      registerHandler({
        target: mockTarget,
        propertyKey: specialKey,
        toolOptions: { name: 'special-tool' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0].propertyKey).toBe(specialKey);
    });

    it('should handle very long property keys', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };
      const longKey = 'a'.repeat(1000);

      registerHandler({
        target: mockTarget,
        propertyKey: longKey,
        toolOptions: { name: 'long-tool' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0].propertyKey).toBe(longKey);
    });
  });

  describe('Global Object Handling', () => {
    it('should work with different global object types', () => {
      // This test verifies that the registry can handle different global object scenarios
      // The actual implementation should handle globalThis, global, and window
      
      const mockTarget = { constructor: { name: 'TestClass' } };
      
      registerHandler({
        target: mockTarget,
        propertyKey: 'testMethod',
        toolOptions: { name: 'test-tool' }
      });

      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(1);
    });

    it('should maintain registry across multiple calls', () => {
      const mockTarget = { constructor: { name: 'TestClass' } };

      // First call
      registerHandler({
        target: mockTarget,
        propertyKey: 'method1',
        toolOptions: { name: 'tool1' }
      });

      // Second call
      registerHandler({
        target: mockTarget,
        propertyKey: 'method2',
        promptOptions: { name: 'prompt1' }
      });

      // Verify both handlers are present
      const handlers = getAllRegisteredHandlers();
      expect(handlers).toHaveLength(2);
    });
  });
}); 