import 'reflect-metadata';
import { registerHandler } from './registry';
import {z} from 'zod';
import { PaymentOptions, isPaymentRequired as isPaymentRequiredGeneric, getPaymentOptions as getPaymentOptionsGeneric } from './PaymentOptions';

export const METADATA_KEY_MCP_PROMPT = 'x402_mcp_protocol:mcp_prompt';

export interface MCPPromptOptions {
  name: string;
  description?: string;
  argsSchema?: z.ZodRawShape;
  title?: string;
  payment?: PaymentOptions;
  _meta?: object;
}

export function MCPPrompt(options: MCPPromptOptions) {
  return function (target: any, propertyKey: string | symbol) {
    // Only support method-level decoration for X402-MCP
    Reflect.defineMetadata(METADATA_KEY_MCP_PROMPT, options, target[propertyKey]);
    
    // Automatically register in global registry
    registerHandler({
      target,
      propertyKey,
      promptOptions: options,
    });
  };
}

/**
 * Utility to check if a method is marked as an MCP prompt.
 */
export function isMCPPrompt(target: Object, propertyKey: string | symbol): boolean {
  const method = target[propertyKey];
  return method ? Reflect.hasMetadata(METADATA_KEY_MCP_PROMPT, method) : false;
}

/**
 * Utility to get MCP prompt config from a method.
 */
export function getMCPPromptOptions(target: Object, propertyKey: string | symbol): MCPPromptOptions | undefined {
  const method = target[propertyKey];
  return method ? Reflect.getMetadata(METADATA_KEY_MCP_PROMPT, method) : undefined;
}

/**
 * Utility to check if a method requires payment.
 */
export function isPaymentRequired(target: Object, propertyKey: string | symbol): boolean {
  return isPaymentRequiredGeneric(getMCPPromptOptions, target, propertyKey);
}

/**
 * Utility to get payment options from a method.
 */
export function getPaymentOptions(target: Object, propertyKey: string | symbol): PaymentOptions | undefined {
  return getPaymentOptionsGeneric(getMCPPromptOptions, target, propertyKey);
} 