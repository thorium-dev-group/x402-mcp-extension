import type { PaymentPayload, PaymentRequirements } from 'x402/types';
import { BaseFacilitatorService, type ValidationResult, type ExecutionResult } from './base-facilitator';
import { PaymentResult } from '../../../shared/schemas';

/**
 * MockFacilitatorService for testing purposes
 * Implements FacilitatorService with runtime PaymentRequirements
 */
export class MockFacilitatorService extends BaseFacilitatorService {
  private shouldValidate: boolean;
  private shouldExecute: boolean;
  private mockTxHash: string;

  constructor(shouldValidate: boolean = true, shouldExecute: boolean = true, mockTxHash: string = 'mock-tx-hash') {
    super();
    this.shouldValidate = shouldValidate;
    this.shouldExecute = shouldExecute;
    this.mockTxHash = mockTxHash;
  }

  /**
   * Performs payment validation using mock logic
   */
  protected async performValidation(payload: PaymentPayload, paymentRequirements: any): Promise<ValidationResult> {
    console.log('MockFacilitator: validatePayment called with:', { payload, paymentRequirements });
    
    if (this.shouldValidate) {
      return this.createValidResult('0x1234567890123456789012345678901234567890');
    } else {
      return this.createInvalidResult('Mock validation failed');
    }
  }

  /**
   * Performs payment execution using mock logic
   */
  protected async performExecution(payload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<PaymentResult> {
    console.log('MockFacilitator: executePayment called with:', { payload, paymentRequirements });
    
    if (this.shouldExecute) {
      return {
        success: true,
        transaction: this.mockTxHash,
        payer: '0x1234567890123456789012345678901234567890',
        network: paymentRequirements.network,
        asset: paymentRequirements.asset,
        outputSchema: paymentRequirements.outputSchema,
      } as PaymentResult;
    } else {
      return {
        success: false,
        transaction: '0x',
        errorReason: 'unexpected_settle_error',
      } as PaymentResult;
    }
  }
}

/**
 * Factory function to create a MockFacilitatorService
 */
export function createMockFacilitator(
  shouldValidate: boolean = true, 
  shouldExecute: boolean = true, 
  mockTxHash: string = 'mock-tx-hash'
): MockFacilitatorService {
  return new MockFacilitatorService(shouldValidate, shouldExecute, mockTxHash);
} 