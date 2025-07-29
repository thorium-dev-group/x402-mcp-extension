import { z } from 'zod';
import {
  JSONRPCResponseSchema,
  ResultSchema,
  JSONRPCNotificationSchema,
  JSONRPCRequestSchema,
  RequestIdSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PaymentRequirementsSchema, PaymentPayloadSchema, SettleResponseSchema } from 'x402/types';


// --- Extended payment requirements with x402Version, paymentId, and requestId ---
export const ExtendedPaymentRequirementsSchema = PaymentRequirementsSchema.extend({
  x402Version: z.literal(1),
  requestId: RequestIdSchema.optional(),
});

export type ExtendedPaymentRequirements = z.infer<typeof ExtendedPaymentRequirementsSchema>;

// --- JSON-RPC request for x402/payment_required (MCP-compliant) ---
export const PaymentRequiredRequestSchema = JSONRPCRequestSchema.merge(z.object({
  method: z.literal('x402/payment_required'),
  params: ExtendedPaymentRequirementsSchema,
}));
export type PaymentRequiredRequest = z.infer<typeof PaymentRequiredRequestSchema>;

// --- JSON-RPC response for x402/payment_required (MCP-compliant) ---
export const PaymentRequiredResponseSchema = JSONRPCResponseSchema.merge(z.object({
  result: ResultSchema.merge(z.object({
    payment: PaymentPayloadSchema,
  })),
}));
export type PaymentRequiredResponse = z.infer<typeof PaymentRequiredResponseSchema>;

// --- Payment result notification (MCP-compliant, x402-style) ---
export const PaymentResultSchema = SettleResponseSchema;
export type PaymentResult = z.infer<typeof PaymentResultSchema>;

export const PaymentResultNotificationSchema = JSONRPCNotificationSchema.merge(z.object({
  method: z.literal('x402/payment_result'),
  params: PaymentResultSchema.extend({
    requestId: RequestIdSchema,
  }),
})); 
export type PaymentResultNotification = z.infer<typeof PaymentResultNotificationSchema>;