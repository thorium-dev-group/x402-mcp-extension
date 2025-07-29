import { PaymentResult } from '../../../shared/schemas';
import type { IFacilitatorService } from './IFacilitatorService';
import type { PaymentPayload, PaymentRequirements } from 'x402/types';

export interface ValidationResult {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  status: 'submitted' | 'confirmed' | 'failed';
  error?: string;
  errorReason?: string;
}

/**
 * Abstract base class for facilitator services
 * Provides common error handling and validation patterns
 */
export abstract class BaseFacilitatorService implements IFacilitatorService {
  /**
   * Abstract method for performing payment validation
   * Must be implemented by concrete facilitators
   */
  protected abstract performValidation(
    payload: PaymentPayload, 
    requirements: any
  ): Promise<ValidationResult>;

  /**
   * Abstract method for performing payment execution
   * Must be implemented by concrete facilitators
   */
  protected abstract performExecution(
    payload: PaymentPayload, 
    requirements: any
  ): Promise<PaymentResult>;

  /**
   * Validates a payment proof with common error handling
   */
  async validatePayment(
    payload: PaymentPayload, 
    paymentRequirements: any
  ): Promise<ValidationResult> {
    try {
      return await this.performValidation(payload, paymentRequirements);
    } catch (error) {
      console.error('Payment validation failed:', error);
      return {
        isValid: false,
        invalidReason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Executes a payment with common error handling
   */
  async executePayment(
    payload: PaymentPayload, 
    paymentRequirements: PaymentRequirements
  ): Promise<PaymentResult> {
    return await this.performExecution(payload, paymentRequirements);
  }

  /**
   * Utility method to create a successful validation result
   */
  protected createValidResult(payer?: string): ValidationResult {
    return {
      isValid: true,
      payer,
    };
  }

  /**
   * Utility method to create an invalid validation result
   */
  protected createInvalidResult(reason: string): ValidationResult {
    return {
      isValid: false,
      invalidReason: reason,
    };
  }
} 