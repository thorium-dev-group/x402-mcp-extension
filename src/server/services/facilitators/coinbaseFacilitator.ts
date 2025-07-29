import type { PaymentPayload, PaymentRequirements } from 'x402/types';
import { useFacilitator } from 'x402/verify';
import { BaseFacilitatorService, type ValidationResult, type ExecutionResult } from './base-facilitator';
import { PaymentResult } from '../../../shared/schemas';
const { createFacilitatorConfig } = require('@coinbase/x402');

/**
 * CoinbaseFacilitatorService implements FacilitatorService by delegating to the official @coinbase/x402 library
 * Uses the CDP facilitator for base-sepolia testnet payments
 */
export class CoinbaseFacilitatorService extends BaseFacilitatorService {
  private verify: any;
  private settle: any;

  constructor(apiKeyId: string, apiKeySecret: string) {
    super();
    // Create the facilitator config using CDP credentials
    const facilitatorConfig = createFacilitatorConfig(apiKeyId, apiKeySecret);
    
    // Get the verify and settle functions from the facilitator
    const { verify, settle } = useFacilitator(facilitatorConfig);
    this.verify = verify;
    this.settle = settle;
  }

  /**
   * Performs payment validation using Coinbase x402 library
   */
  protected async performValidation(payload: PaymentPayload, paymentRequirements: any): Promise<ValidationResult> {
    const result = await this.verify(payload, paymentRequirements);
    return {
      isValid: result.isValid,
      invalidReason: result.invalidReason,
      payer: result.payer,
    };
  }

  /**
   * Performs payment execution using Coinbase x402 library
   */
  protected async performExecution(payload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<PaymentResult> {
    return await this.settle(payload, paymentRequirements) as PaymentResult;
  }
}

/**
 * Factory function to create a CoinbaseFacilitatorService
 * 
 * @param apiKeyId - Optional CDP API key ID (defaults to CDP_API_KEY_ID env var)
 * @param apiKeySecret - Optional CDP API key secret (defaults to CDP_API_KEY_SECRET env var)
 */
export function createCoinbaseFacilitator(
  apiKeyId?: string,
  apiKeySecret?: string
): CoinbaseFacilitatorService {
  if (!apiKeyId || !apiKeySecret) {
    apiKeyId = process.env.CDP_API_KEY_ID;
    apiKeySecret = process.env.CDP_API_KEY_SECRET;
    if (!apiKeyId || !apiKeySecret) {
      throw new Error('CDP_API_KEY_ID and/or CDP_API_KEY_SECRET not found in environment variables. Some tests may be skipped.');
    }
  }
  return new CoinbaseFacilitatorService(apiKeyId, apiKeySecret);
} 