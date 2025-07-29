import { MCPTool } from "../../server/decorators/mcpTool";
import { z } from "zod";

export class TestCalculator {

    @MCPTool({ 
        name: 'add-numbers', 
        description: 'Adds two numbers together',
        inputSchema: { a: z.number(), b: z.number() },
        payment: { amount: 0.001, description: 'Pay for calculation' }
      })
      async addNumbers(args: any, extra: any) {
        
        return { 
          content: [{ 
            type: 'text', 
            text: `Result: ${args.a + args.b}` 
          }] 
        };
      }
  
      @MCPTool({ 
        name: 'multiply-numbers', 
        description: 'Multiplies two numbers together',
        inputSchema: { a: z.number(), b: z.number() },
        payment: { amount: 0.002, description: 'Pay for multiplication' }
      })
      async multiplyNumbers(args: any, extra: any) {
        return { 
          content: [{ 
            type: 'text', 
            text: `Result: ${args.a * args.b}` 
          }] 
        };
      }
  
      @MCPTool({ 
        name: 'free-calculator', 
        description: 'Free calculator that doesn\'t require payment',
        inputSchema: { operation: z.string(), a: z.number(), b: z.number() }
      })
      async freeCalculator(args: any, extra: any) {
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
}