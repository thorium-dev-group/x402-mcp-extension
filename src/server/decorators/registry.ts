import { MCPPromptOptions } from "./mcpPrompt";
import { MCPResourceOptions } from "./mcpResource";
import { MCPToolOptions } from "./mcpTool";
import { PaymentOptions } from './PaymentOptions';

export interface RegisteredHandler {
  target: any;
  propertyKey: string | symbol; // Required for method-level decorators
  toolOptions?: MCPToolOptions;
  promptOptions?: MCPPromptOptions;
  resourceOptions?: MCPResourceOptions;
}

// Use a unique key on the global object to persist the registry across reloads
const GLOBAL_REGISTRY_KEY = '__x402_mcp_globalHandlerRegistry__';

function getGlobalObject(): any {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof global !== 'undefined') return global;
  if (typeof (globalThis as any).window !== 'undefined') return (globalThis as any).window;
  throw new Error('Unable to determine global object for registry');
}

function getGlobalRegistry(): Map<string, RegisteredHandler> {
  const globalObj = getGlobalObject();
  if (!globalObj[GLOBAL_REGISTRY_KEY]) {
    globalObj[GLOBAL_REGISTRY_KEY] = new Map<string, RegisteredHandler>();
  }
  return globalObj[GLOBAL_REGISTRY_KEY];
}

const globalHandlerRegistry: Map<string, RegisteredHandler> = getGlobalRegistry();

// Simple logger for registry operations
const logger = {
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Registry] ${message}`, ...args);
    }
  }
};

function getHandlerKey(target: any, propertyKey: string | symbol): string {
  // Handles both prototype and instance methods
  const ctorName = target.constructor?.name || target.name || 'anonymous';
  return `${ctorName}.${String(propertyKey)}`;
}

/**
 * Registers a handler in the global registry
 */
export function registerHandler(handler: RegisteredHandler): void {
  const key = getHandlerKey(handler.target, handler.propertyKey);
  logger.debug('Registering handler', key);
  
  const existing = globalHandlerRegistry.get(key);
  if (existing) {
    // Merge options
    globalHandlerRegistry.set(key, { ...existing, ...handler });
    logger.debug('Updated existing handler', key);
  } else {
    globalHandlerRegistry.set(key, handler);
    logger.debug('Added new handler', key);
  }
}

/**
 * Gets all registered handlers from the global registry
 */
export function getAllRegisteredHandlers(): RegisteredHandler[] {
  const handlers = Array.from(globalHandlerRegistry.values());
  logger.debug('Getting all registered handlers', handlers.length);
  
  for (const handler of handlers) {
    logger.debug('Handler details', getHandlerKey(handler.target, handler.propertyKey));
  }
  return handlers;
}

/**
 * Clears the global handler registry (useful for testing)
 */
export function clearGlobalRegistry(): void {
  globalHandlerRegistry.clear();
}

/**
 * Gets registry statistics for debugging
 */
export function getRegistryStats(): { size: number; keys: string[] } {
  return {
    size: globalHandlerRegistry.size,
    keys: Array.from(globalHandlerRegistry.keys())
  };
}

/**
 * Updates a handler in the global registry by key
 */
export function updateHandler(target: any, propertyKey: string | symbol, update: Partial<RegisteredHandler>): void {
  const key = getHandlerKey(target, propertyKey);
  const existing = globalHandlerRegistry.get(key);
  if (existing) {
    Object.assign(existing, update);
    globalHandlerRegistry.set(key, existing);
  }
}

/**
 * Discovers decorated handlers from modules
 * @deprecated Use the new HandlerRegistry.createSessionHandlers() instead
 */
export function discoverDecoratedHandlers(modules: any[]): RegisteredHandler[] {
  const handlers: RegisteredHandler[] = [];
  
  for (const module of modules) {
    if (typeof module === 'function' && module.prototype) {
      // It's a class constructor
      const prototype = module.prototype;
      const methods = Object.getOwnPropertyNames(prototype);
      
      for (const methodName of methods) {
        if (methodName === 'constructor') continue;
        
        const method = prototype[methodName];
        if (typeof method === 'function') {
          // Check if this method has any decorators
          const hasToolOptions = Reflect.hasMetadata('x402_mcp_protocol:mcp_tool', method);
          const hasPromptOptions = Reflect.hasMetadata('x402_mcp_protocol:mcp_prompt', method);
          const hasResourceOptions = Reflect.hasMetadata('x402_mcp_protocol:mcp_resource', method);
          
          if (hasToolOptions || hasPromptOptions || hasResourceOptions) {
            handlers.push({
              target: prototype,
              propertyKey: methodName,
              toolOptions: hasToolOptions ? Reflect.getMetadata('x402_mcp_protocol:mcp_tool', method) : undefined,
              promptOptions: hasPromptOptions ? Reflect.getMetadata('x402_mcp_protocol:mcp_prompt', method) : undefined,
              resourceOptions: hasResourceOptions ? Reflect.getMetadata('x402_mcp_protocol:mcp_resource', method) : undefined,
            });
          }
        }
      }
    }
  }
  
  return handlers;
} 