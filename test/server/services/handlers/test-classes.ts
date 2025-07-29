import { MCPTool } from '../../../../src/server/decorators/mcpTool';
import { MCPPrompt } from '../../../../src/server/decorators/mcpPrompt';
import { MCPResource } from '../../../../src/server/decorators/mcpResource';
import { z } from 'zod';

// Input schemas for testing
const TestInputSchema = z.object({
  input: z.string(),
  number: z.number().optional()
});

const TestOutputSchema = z.string();

const TestPromptSchema = z.object({
  prompt: z.string(),
  context: z.string().optional()
});

const TestResourceSchema = z.object({
  uri: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional()
});

// Test class with tool handlers
export class TestToolClass {
  @MCPTool({
    name: 'test-tool',
    description: 'Test tool description',
    inputSchema: { input: z.string(), number: z.number().optional() },
    outputSchema: TestOutputSchema
  })
  async testTool(input: z.infer<typeof TestInputSchema>): Promise<string> {
    return `Processed: ${input.input}`;
  }

  @MCPTool({
    name: 'test-tool-no-schema',
    description: 'Test tool without schema'
  })
  async testToolNoSchema(input: any): Promise<string> {
    return `Processed: ${JSON.stringify(input)}`;
  }

  @MCPTool({
    name: 'test-tool-with-payment',
    description: 'Test tool with payment requirement'
  })
  async testToolWithPayment(input: z.infer<typeof TestInputSchema>): Promise<string> {
    return `Paid tool result: ${input.input}`;
  }

  @MCPTool({
    name: 'failing-tool',
    description: 'Tool that throws an error'
  })
  async failingTool(input: z.infer<typeof TestInputSchema>): Promise<string> {
    throw new Error('Tool execution failed');
  }
}

// Test class with prompt handlers
export class TestPromptClass {
  @MCPPrompt({
    name: 'test-prompt',
    description: 'Test prompt description',
    argsSchema: { prompt: z.string(), context: z.string().optional() }
  })
  async testPrompt(args: z.infer<typeof TestPromptSchema>): Promise<string> {
    return `Prompt response: ${args.prompt}`;
  }

  @MCPPrompt({
    name: 'test-prompt-no-schema',
    description: 'Test prompt without schema'
  })
  async testPromptNoSchema(args: any): Promise<string> {
    return `Prompt response: ${JSON.stringify(args)}`;
  }

  @MCPPrompt({
    name: 'test-prompt-with-payment',
    description: 'Test prompt with payment requirement'
  })
  async testPromptWithPayment(args: z.infer<typeof TestPromptSchema>): Promise<string> {
    return `Paid prompt response: ${args.prompt}`;
  }
}

// Test class with resource handlers
export class TestResourceClass {
  @MCPResource({
    name: 'test-resource',
    description: 'Test resource description',
    uri: 'test://resource'
  })
  async testResource(args: z.infer<typeof TestResourceSchema>): Promise<string> {
    return `Resource response: ${args.uri}`;
  }

  @MCPResource({
    name: 'test-resource-template',
    description: 'Test resource template description',
    template: 'test://template/{id}'
  })
  async testResourceTemplate(args: z.infer<typeof TestResourceSchema>): Promise<string> {
    return `Template response: ${args.uri}`;
  }

  @MCPResource({
    name: 'test-resource-with-payment',
    description: 'Test resource with payment requirement',
    uri: 'test://paid-resource'
  })
  async testResourceWithPayment(args: z.infer<typeof TestResourceSchema>): Promise<string> {
    return `Paid resource response: ${args.uri}`;
  }
}

// Test class with mixed handlers
export class TestMixedClass {
  @MCPTool({
    name: 'mixed-tool',
    description: 'Mixed class tool'
  })
  async mixedTool(input: any): Promise<string> {
    return `Mixed tool: ${JSON.stringify(input)}`;
  }

  @MCPPrompt({
    name: 'mixed-prompt',
    description: 'Mixed class prompt'
  })
  async mixedPrompt(args: any): Promise<string> {
    return `Mixed prompt: ${JSON.stringify(args)}`;
  }

  @MCPResource({
    name: 'mixed-resource',
    description: 'Mixed class resource',
    uri: 'test://mixed-resource'
  })
  async mixedResource(args: any): Promise<string> {
    return `Mixed resource: ${JSON.stringify(args)}`;
  }
}

// Test class with symbol property keys
export class TestSymbolClass {
  @MCPTool({
    name: 'symbol-tool',
    description: 'Tool with symbol property key'
  })
  async [Symbol('testSymbol')](input: any): Promise<string> {
    return `Symbol tool: ${JSON.stringify(input)}`;
  }
}

// Test class with constructor parameters (should fail)
export class TestFailingClass {
  constructor(private dependency: any) {}

  @MCPTool({
    name: 'failing-constructor-tool',
    description: 'Tool in class with constructor parameters'
  })
  async failingConstructorTool(input: any): Promise<string> {
    return `Failing tool: ${JSON.stringify(input)}`;
  }
}

// Export all test classes for use in tests
export const TestClasses = {
  TestToolClass,
  TestPromptClass,
  TestResourceClass,
  TestMixedClass,
  TestSymbolClass,
  TestFailingClass
}; 