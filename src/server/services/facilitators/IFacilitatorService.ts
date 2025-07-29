import { PaymentPayload, PaymentRequirements } from "x402/types";
import { PaymentResult } from "../../../shared/schemas";

/**
 * FacilitatorService: Abstracts payment execution and validation.
 * See: server-facilitator.unit-spec.md, DEV_MANIFEST_X402_MCP_EXTENSION.md
 */
export interface IFacilitatorService {
    // Validates a payment proof (signature, fields, etc.)
    validatePayment(payload: PaymentPayload, paymentRequirements: any): Promise<{
      isValid: boolean;
      invalidReason?: string;
    }>;
    
    // Executes a payment and returns a transaction/result
    executePayment(payload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<PaymentResult>;
  }