import 'reflect-metadata';
import { registerHandler } from './registry';
import {z} from 'zod';
import { PaymentOptions, isPaymentRequired as isPaymentRequiredGeneric, getPaymentOptions as getPaymentOptionsGeneric } from './PaymentOptions';

export const METADATA_KEY_MCP_TOOL = 'x402_mcp_protocol:mcp_tool';

export interface MCPToolOptions {
  name: string;
  description?: string;
  inputSchema?: z.ZodRawShape;
  outputSchema?: z.ZodSchema;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  payment?: PaymentOptions;
  _meta?: object;
}

export function MCPTool(options: MCPToolOptions) {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // Only support method-level decoration for X402-MCP
    Reflect.defineMetadata(METADATA_KEY_MCP_TOOL, options, target[propertyKey]);
    
    // Automatically register in global registry
    registerHandler({
      target,
      propertyKey,
      toolOptions: options,
    });
  };
}

/**
 * Utility to check if a method is marked as an MCP tool.
 */
export function isMCPTool(target: Object, propertyKey: string | symbol): boolean {
  const method = target[propertyKey];
  return method ? Reflect.hasMetadata(METADATA_KEY_MCP_TOOL, method) : false;
}

/**
 * Utility to get MCP tool config from a method.
 */
export function getMCPToolOptions(target: Object, propertyKey: string | symbol): MCPToolOptions | undefined {
  const method = target[propertyKey];
  return method ? Reflect.getMetadata(METADATA_KEY_MCP_TOOL, method) : undefined;
}

/**
 * Utility to check if a method requires payment.
 */
export function isPaymentRequired(target: Object, propertyKey: string | symbol): boolean {
  return isPaymentRequiredGeneric(getMCPToolOptions, target, propertyKey);
}

/**
 * Utility to get payment options from a method.
 */
export function getPaymentOptions(target: Object, propertyKey: string | symbol): PaymentOptions | undefined {
  return getPaymentOptionsGeneric(getMCPToolOptions, target, propertyKey);
} 