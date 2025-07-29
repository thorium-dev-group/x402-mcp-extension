import { getMCPPromptOptions, MCPPromptOptions, isPaymentRequired as isPromptPaymentRequired, getPaymentOptions as getPromptPaymentOptions } from '../../decorators/mcpPrompt';
import { getMCPResourceOptions, MCPResourceOptions, isPaymentRequired as isResourcePaymentRequired, getPaymentOptions as getResourcePaymentOptions } from '../../decorators/mcpResource';
import { getMCPToolOptions, MCPToolOptions, isPaymentRequired as isToolPaymentRequired, getPaymentOptions as getToolPaymentOptions } from '../../decorators/mcpTool';
import { PaymentOptions } from '../../decorators/PaymentOptions';

export interface HandlerInfo {
  name: string;
  handler: Function;
  type: 'tool' | 'prompt' | 'resource' | 'resourceTemplate';
  options: MCPToolOptions | MCPPromptOptions | MCPResourceOptions;
  paymentOptions?: PaymentOptions;
  instance: any;
}

// Type for constructor functions
export type HandlerClass = new (...args: any[]) => any;

// Session handlers organized by type
export interface SessionHandlers {
  tools: HandlerInfo[];
  prompts: HandlerInfo[];
  resources: HandlerInfo[];
  resourceTemplates: HandlerInfo[];
}

export class HandlerRegistry {
  /**
   * Creates session-specific instances and extracts handlers organized by type
   */
  static createSessionHandlers(handlerClasses: HandlerClass[]): SessionHandlers {
    const sessionHandlers: SessionHandlers = {
      tools: [],
      prompts: [],
      resources: [],
      resourceTemplates: []
    };
    
    for (const handlerClass of handlerClasses) {
      // Create unique instance per session
      const instance = new handlerClass();
      
      // Extract decorated handlers from this instance
      const instanceHandlers = HandlerRegistry.extractHandlersFromInstance(instance);
      
      // Add to appropriate arrays based on type
      for (const handlerInfo of instanceHandlers) {
        switch (handlerInfo.type) {
          case 'tool':
            sessionHandlers.tools.push(handlerInfo);
            break;
          case 'prompt':
            sessionHandlers.prompts.push(handlerInfo);
            break;
          case 'resource':
            sessionHandlers.resources.push(handlerInfo);
            break;
          case 'resourceTemplate':
            sessionHandlers.resourceTemplates.push(handlerInfo);
            break;
        }
      }
    }
    
    return sessionHandlers;
  }

  /**
   * Extract all decorated handlers from an instance
   */
  static extractHandlersFromInstance(instance: any): HandlerInfo[] {
    const handlers: HandlerInfo[] = [];
    const prototype = Object.getPrototypeOf(instance);
    const methods = Object.getOwnPropertyNames(prototype);
    
    for (const methodName of methods) {
      if (methodName === 'constructor') continue;
      
      const method = prototype[methodName];
      if (typeof method !== 'function') continue;
      
      // Check for MCP decorators
      const toolOptions = getMCPToolOptions(instance, methodName);
      const promptOptions = getMCPPromptOptions(instance, methodName);
      const resourceOptions = getMCPResourceOptions(instance, methodName);
      
      if (toolOptions) {
        handlers.push({
          name: toolOptions.name,
          handler: method.bind(instance),
          type: 'tool',
          options: toolOptions,
          paymentOptions: toolOptions.payment,
          instance,
        });
      } else if (promptOptions) {
        handlers.push({
          name: promptOptions.name,
          handler: method.bind(instance),
          type: 'prompt',
          options: promptOptions,
          paymentOptions: promptOptions.payment,
          instance,
        });
      } else if (resourceOptions) {
        if (resourceOptions.template) {
          handlers.push({
            name: resourceOptions.name,
            handler: method.bind(instance),
            type: 'resourceTemplate',
            options: resourceOptions,
            paymentOptions: resourceOptions.payment,
            instance,
          });
        } else {
          handlers.push({
            name: resourceOptions.name,
            handler: method.bind(instance),
            type: 'resource',
            options: resourceOptions,
            paymentOptions: resourceOptions.payment,
            instance,
          });
        }
      }
    }
    
    return handlers;
  }

  /**
   * Utility to check if a handler requires payment
   */
  static isPaymentRequired(handlerInfo: HandlerInfo): boolean {
    return handlerInfo.paymentOptions !== undefined;
  }

  /**
   * Utility to get payment options from a handler
   */
  static getPaymentOptions(handlerInfo: HandlerInfo): PaymentOptions | undefined {
    return handlerInfo.paymentOptions;
  }
} 