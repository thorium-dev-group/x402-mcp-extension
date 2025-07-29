import 'reflect-metadata';
import { registerHandler } from './registry';
import { PaymentOptions, isPaymentRequired as isPaymentRequiredGeneric, getPaymentOptions as getPaymentOptionsGeneric } from './PaymentOptions';

export const METADATA_KEY_MCP_RESOURCE = 'x402_mcp_protocol:mcp_resource';

export interface MCPResourceOptions {
  name: string;
  uri?: string;
  template?: string;
  description?: string;
  mimeType?: string;
  title?: string;
  payment?: PaymentOptions;
  // ResourceTemplate-specific options
  listCallback?: (extra: any) => Promise<{ resources: Array<{ uri: string }> }> | { resources: Array<{ uri: string }> };
  completeCallbacks?: {
    [variable: string]: (value: string, context?: { arguments?: Record<string, string> }) => string[] | Promise<string[]>;
  };
  _meta?: object;
}

export function MCPResource(options: MCPResourceOptions) {
  return function (target: any, propertyKey: string | symbol) {
    // Only support method-level decoration for X402-MCP
    Reflect.defineMetadata(METADATA_KEY_MCP_RESOURCE, options, target[propertyKey]);
    
    // Automatically register in global registry
    registerHandler({
      target,
      propertyKey,
      resourceOptions: options,
    });
  };
}

/**
 * Utility to check if a method is marked as an MCP resource.
 */
export function isMCPResource(target: Object, propertyKey: string | symbol): boolean {
  const method = target[propertyKey];
  return method ? Reflect.hasMetadata(METADATA_KEY_MCP_RESOURCE, method) : false;
}

/**
 * Utility to get MCP resource config from a method.
 */
export function getMCPResourceOptions(target: Object, propertyKey: string | symbol): MCPResourceOptions | undefined {
  const method = target[propertyKey];
  return method ? Reflect.getMetadata(METADATA_KEY_MCP_RESOURCE, method) : undefined;
}

/**
 * Utility to check if a method requires payment.
 */
export function isPaymentRequired(target: Object, propertyKey: string | symbol): boolean {
  return isPaymentRequiredGeneric(getMCPResourceOptions, target, propertyKey);
}

/**
 * Utility to get payment options from a method.
 */
export function getPaymentOptions(target: Object, propertyKey: string | symbol): PaymentOptions | undefined {
  return getPaymentOptionsGeneric(getMCPResourceOptions, target, propertyKey);
} 