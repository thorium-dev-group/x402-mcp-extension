import { HandlerRegistry, type HandlerInfo, type HandlerClass, type SessionHandlers } from '../../../../src/server/services/handlers/handler-registry';
import { getMCPToolOptions } from '../../../../src/server/decorators/mcpTool';
import { getMCPPromptOptions } from '../../../../src/server/decorators/mcpPrompt';
import { getMCPResourceOptions } from '../../../../src/server/decorators/mcpResource';

// Mock decorators
jest.mock('../../../../src/server/decorators/mcpTool');
jest.mock('../../../../src/server/decorators/mcpPrompt');
jest.mock('../../../../src/server/decorators/mcpResource');

describe('HandlerRegistry', () => {
  let mockGetMCPToolOptions: jest.MockedFunction<typeof getMCPToolOptions>;
  let mockGetMCPPromptOptions: jest.MockedFunction<typeof getMCPPromptOptions>;
  let mockGetMCPResourceOptions: jest.MockedFunction<typeof getMCPResourceOptions>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get mocked decorator functions
    mockGetMCPToolOptions = getMCPToolOptions as jest.MockedFunction<typeof getMCPToolOptions>;
    mockGetMCPPromptOptions = getMCPPromptOptions as jest.MockedFunction<typeof getMCPPromptOptions>;
    mockGetMCPResourceOptions = getMCPResourceOptions as jest.MockedFunction<typeof getMCPResourceOptions>;
  });

  describe('createSessionHandlers', () => {
    it('should create session handlers successfully', () => {
      // Arrange
      class TestHandler {
        testTool() {}
        testPrompt() {}
      }

      const handlerClasses: HandlerClass[] = [TestHandler];

      // Mock decorator responses
      mockGetMCPToolOptions.mockReturnValue({ name: 'test-tool' });
      mockGetMCPPromptOptions.mockReturnValue({ name: 'test-prompt' });
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.createSessionHandlers(handlerClasses);

      // Assert
      expect(result).toHaveProperty('tools');
      expect(result).toHaveProperty('prompts');
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('resourceTemplates');
      expect(Array.isArray(result.tools)).toBe(true);
      expect(Array.isArray(result.prompts)).toBe(true);
      expect(Array.isArray(result.resources)).toBe(true);
      expect(Array.isArray(result.resourceTemplates)).toBe(true);
    });

    it('should handle empty handler classes array', () => {
      // Arrange
      const handlerClasses: HandlerClass[] = [];

      // Act
      const result = HandlerRegistry.createSessionHandlers(handlerClasses);

      // Assert
      expect(result.tools).toHaveLength(0);
      expect(result.prompts).toHaveLength(0);
      expect(result.resources).toHaveLength(0);
      expect(result.resourceTemplates).toHaveLength(0);
    });

    it('should create unique instances for each handler class', () => {
      // Arrange
      class Handler1 {
        tool1() {}
      }

      class Handler2 {
        tool2() {}
      }

      const handlerClasses: HandlerClass[] = [Handler1, Handler2];

      // Mock decorator responses
      mockGetMCPToolOptions
        .mockReturnValueOnce({ name: 'tool1' })
        .mockReturnValueOnce({ name: 'tool2' });
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.createSessionHandlers(handlerClasses);

      // Assert
      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].name).toBe('tool1');
      expect(result.tools[1].name).toBe('tool2');
    });

    it('should handle tools with payment requirements', () => {
      // Arrange
      class TestHandler {
        paidTool() {}
      }

      const handlerClasses: HandlerClass[] = [TestHandler];

      // Mock decorator responses with payment options
      mockGetMCPToolOptions.mockReturnValue({ 
        name: 'paid-tool',
        payment: { amount: 0.001, description: 'Payment required' }
      });
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.createSessionHandlers(handlerClasses);

      // Assert
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('paid-tool');
      expect(result.tools[0].paymentOptions).toEqual({ amount: 0.001, description: 'Payment required' });
    });

    it('should categorize handlers by type correctly', () => {
      // Arrange
      class TestHandler {
        tool() {}
        prompt() {}
        resource() {}
        template() {}
      }

      const handlerClasses: HandlerClass[] = [TestHandler];

      // Mock decorator responses - each method will be checked for all decorator types
      // For tool() method: tool decorator returns value, others return undefined
      mockGetMCPToolOptions
        .mockReturnValueOnce({ name: 'test-tool' }) // tool()
        .mockReturnValueOnce(undefined) // prompt()
        .mockReturnValueOnce(undefined) // resource()
        .mockReturnValueOnce(undefined); // template()
      
      mockGetMCPPromptOptions
        .mockReturnValueOnce(undefined) // tool()
        .mockReturnValueOnce({ name: 'test-prompt' }) // prompt()
        .mockReturnValueOnce(undefined) // resource()
        .mockReturnValueOnce(undefined); // template()
      
      mockGetMCPResourceOptions
        .mockReturnValueOnce(undefined) // tool()
        .mockReturnValueOnce(undefined) // prompt()
        .mockReturnValueOnce({ name: 'test-resource', uri: 'test://resource' }) // resource()
        .mockReturnValueOnce({ name: 'test-template', template: 'test://template' }); // template()
      
      // Act
      const result = HandlerRegistry.createSessionHandlers(handlerClasses);

      // Assert
      expect(result.tools).toHaveLength(1);
      expect(result.prompts).toHaveLength(1);
      expect(result.resources).toHaveLength(1);
      expect(result.resourceTemplates).toHaveLength(1);
      expect(result.tools[0].name).toBe('test-tool');
      expect(result.prompts[0].name).toBe('test-prompt');
      expect(result.resources[0].name).toBe('test-resource');
      expect(result.resourceTemplates[0].name).toBe('test-template');
    });
  });

  describe('extractHandlersFromInstance', () => {
    it('should extract tool handlers from instance', () => {
      // Arrange
      class TestHandler {
        testTool() {}
      }

      const instance = new TestHandler();

      // Mock decorator responses
      mockGetMCPToolOptions.mockReturnValue({ name: 'test-tool' });
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-tool');
      expect(result[0].type).toBe('tool');
      expect(result[0].handler).toBeInstanceOf(Function);
      expect(result[0].instance).toBe(instance);
    });

    it('should extract prompt handlers from instance', () => {
      // Arrange
      class TestHandler {
        testPrompt() {}
      }

      const instance = new TestHandler();

      // Mock decorator responses
      mockGetMCPToolOptions.mockReturnValue(undefined);
      mockGetMCPPromptOptions.mockReturnValue({ name: 'test-prompt' });
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-prompt');
      expect(result[0].type).toBe('prompt');
      expect(result[0].handler).toBeInstanceOf(Function);
    });

    it('should extract resource handlers from instance', () => {
      // Arrange
      class TestHandler {
        testResource() {}
      }

      const instance = new TestHandler();

      // Mock decorator responses
      mockGetMCPToolOptions.mockReturnValue(undefined);
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue({ name: 'test-resource', uri: 'test://resource' });

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-resource');
      expect(result[0].type).toBe('resource');
      expect(result[0].handler).toBeInstanceOf(Function);
    });

    it('should extract resource template handlers from instance', () => {
      // Arrange
      class TestHandler {
        testTemplate() {}
      }

      const instance = new TestHandler();

      // Mock decorator responses
      mockGetMCPToolOptions.mockReturnValue(undefined);
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue({ name: 'test-template', template: 'test://template' });

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-template');
      expect(result[0].type).toBe('resourceTemplate');
      expect(result[0].handler).toBeInstanceOf(Function);
    });

    it('should skip methods without decorators', () => {
      // Arrange
      class TestHandler {
        testTool() {}
        noDecorator() {}
      }

      const instance = new TestHandler();

      // Mock decorator responses - only first method has tool decorator
      mockGetMCPToolOptions
        .mockReturnValueOnce({ name: 'test-tool' })
        .mockReturnValueOnce(undefined);
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-tool');
    });

    it('should skip constructor method', () => {
      // Arrange
      class TestHandler {
        constructor() {}
        testTool() {}
      }

      const instance = new TestHandler();

      // Mock decorator responses
      mockGetMCPToolOptions.mockReturnValue({ name: 'test-tool' });
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-tool');
    });

    it('should handle multiple handlers of different types', () => {
      // Arrange
      class TestHandler {
        tool1() {}
        tool2() {}
        prompt1() {}
        resource1() {}
      }

      const instance = new TestHandler();

      // Mock decorator responses
      mockGetMCPToolOptions
        .mockReturnValueOnce({ name: 'tool1' })
        .mockReturnValueOnce({ name: 'tool2' })
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      mockGetMCPPromptOptions
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({ name: 'prompt1' })
        .mockReturnValueOnce(undefined);
      mockGetMCPResourceOptions
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({ name: 'resource1', uri: 'test://resource' });

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(4);
      const toolHandlers = result.filter(h => h.type === 'tool');
      const promptHandlers = result.filter(h => h.type === 'prompt');
      const resourceHandlers = result.filter(h => h.type === 'resource');
      
      expect(toolHandlers).toHaveLength(2);
      expect(promptHandlers).toHaveLength(1);
      expect(resourceHandlers).toHaveLength(1);
    });

    it('should bind handlers to instance', () => {
      // Arrange
      class TestHandler {
        private value = 'test';
        
        testTool() {
          return this.value;
        }
      }

      const instance = new TestHandler();

      // Mock decorator responses
      mockGetMCPToolOptions.mockReturnValue({ name: 'test-tool' });
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].handler()).toBe('test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle instance with no decorated methods', () => {
      // Arrange
      class TestHandler {
        noDecorator() {}
      }

      const instance = new TestHandler();

      // Mock decorator responses - all return undefined
      mockGetMCPToolOptions.mockReturnValue(undefined);
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle instance with non-function properties', () => {
      // Arrange
      class TestHandler {
        testTool() {}
        property = 'value';
      }

      const instance = new TestHandler();

      // Mock decorator responses
      mockGetMCPToolOptions.mockReturnValue({ name: 'test-tool' });
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-tool');
    });

    it('should handle decorators returning null/undefined', () => {
      // Arrange
      class TestHandler {
        testMethod() {}
      }

      const instance = new TestHandler();

      // Mock decorator responses - all return null/undefined
      mockGetMCPToolOptions.mockReturnValue(undefined);
      mockGetMCPPromptOptions.mockReturnValue(undefined);
      mockGetMCPResourceOptions.mockReturnValue(undefined);

      // Act
      const result = HandlerRegistry.extractHandlersFromInstance(instance);

      // Assert
      expect(result).toHaveLength(0);
    });
  });
}); 