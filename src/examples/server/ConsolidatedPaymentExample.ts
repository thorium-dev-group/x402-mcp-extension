import { MCPTool } from "../../server/decorators/mcpTool";
import { MCPPrompt } from "../../server/decorators/mcpPrompt";
import { MCPResource } from "../../server/decorators/mcpResource";
import { z } from "zod";

/**
 * Example demonstrating the consolidated payment approach
 * Payment options are now integrated directly into the MCP decorators
 */
export class ConsolidatedPaymentExample {

  // Tool with payment
  @MCPTool({ 
    name: 'paid-calculator', 
    description: 'Advanced calculator that requires payment',
    inputSchema: { operation: z.enum(['add', 'subtract', 'multiply', 'divide']), a: z.number(), b: z.number() },
    payment: { amount: 0.001, description: 'Pay for advanced calculation' }
  })
  async advancedCalculator(args: any, extra: any) {
    let result: number;
    switch (args.operation) {
      case 'add':
        result = args.a + args.b;
        break;
      case 'subtract':
        result = args.a - args.b;
        break;
      case 'multiply':
        result = args.a * args.b;
        break;
      case 'divide':
        if (args.b === 0) throw new Error('Division by zero');
        result = args.a / args.b;
        break;
      default:
        throw new Error(`Unknown operation: ${args.operation}`);
    }
    
    return { 
      content: [{ 
        type: 'text', 
        text: `Result: ${result}` 
      }] 
    };
  }

  // Tool without payment
  @MCPTool({ 
    name: 'free-calculator', 
    description: 'Basic calculator that is free to use',
    inputSchema: { operation: z.enum(['add', 'subtract']), a: z.number(), b: z.number() }
  })
  async basicCalculator(args: any, extra: any) {
    let result: number;
    switch (args.operation) {
      case 'add':
        result = args.a + args.b;
        break;
      case 'subtract':
        result = args.a - args.b;
        break;
      default:
        throw new Error(`Unknown operation: ${args.operation}`);
    }
    
    return { 
      content: [{ 
        type: 'text', 
        text: `Result: ${result}` 
      }] 
    };
  }

  // Prompt with payment
  @MCPPrompt({ 
    name: 'paid-analysis', 
    description: 'Advanced text analysis that requires payment',
    argsSchema: { text: z.string(), analysisType: z.enum(['sentiment', 'keywords', 'summary']) },
    payment: { amount: 0.002, description: 'Pay for advanced text analysis' }
  })
  async analyzeText(args: any, extra: any) {
    // Simulate text analysis
    const analysis = `Analysis of "${args.text.substring(0, 20)}..." using ${args.analysisType}`;
    
    return { 
      content: [{ 
        type: 'text', 
        text: analysis 
      }] 
    };
  }

  // Prompt without payment
  @MCPPrompt({ 
    name: 'free-analysis', 
    description: 'Basic text analysis that is free',
    argsSchema: { text: z.string() }
  })
  async basicTextAnalysis(args: any, extra: any) {
    const wordCount = args.text.split(' ').length;
    
    return { 
      content: [{ 
        type: 'text', 
        text: `Word count: ${wordCount}` 
      }] 
    };
  }

  // Resource with payment
  @MCPResource({ 
    name: 'paid-document', 
    uri: 'https://example.com/paid-document',
    description: 'Premium document that requires payment',
    mimeType: 'application/pdf',
    payment: { amount: 0.005, description: 'Pay for premium document access' }
  })
  async getPaidDocument(args: any, extra: any) {
    return { 
      content: [{ 
        type: 'text', 
        text: 'Premium document content' 
      }] 
    };
  }

  // Resource without payment
  @MCPResource({ 
    name: 'free-document', 
    uri: 'https://example.com/free-document',
    description: 'Free document that anyone can access',
    mimeType: 'text/plain'
  })
  async getFreeDocument(args: any, extra: any) {
    return { 
      content: [{ 
        type: 'text', 
        text: 'Free document content' 
      }] 
    };
  }

  // Resource template with payment
  @MCPResource({ 
    name: 'paid-template', 
    template: 'https://example.com/paid/{id}',
    description: 'Premium resource template that requires payment',
    payment: { amount: 0.003, description: 'Pay for premium resource access' }
  })
  async getPaidResource(args: any, extra: any) {
    return { 
      content: [{ 
        type: 'text', 
        text: `Premium resource for ID: ${args.id}` 
      }] 
    };
  }
} 