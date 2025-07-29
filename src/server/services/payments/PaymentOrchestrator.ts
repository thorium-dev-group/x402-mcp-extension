import { RequestId } from "@modelcontextprotocol/sdk/types.js";
import { IFacilitatorService } from "../facilitators/IFacilitatorService";
import { PaymentPayload, PaymentRequirements } from "x402/types";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { PaymentRequiredRequest, PaymentRequiredResponse, PaymentRequiredResponseSchema, PaymentResult, PaymentResultNotification, PaymentResultNotificationSchema } from "../../../shared/schemas";
import { PaymentError } from "../../../shared/errors/PaymentError";
import { ERROR_CODES } from "../../../shared/error-codes";
import { ILogger, ILoggerFactory } from "../../../shared/interfaces";
import { ConsoleLogger } from "../../../shared/services";
import { IPaymentOrchestrator } from "./IPaymentOrchestrator";

export interface PaymentOrchestratorOptions {
  payTo: string;
  network: string;
  facilitator: IFacilitatorService;
  loggerFactory: ILoggerFactory;
}

// Extended extra type to allow storing payment context
interface PaymentContextExtra extends RequestHandlerExtra<any, any> {
  paymentProof?: PaymentPayload;
  paymentRequirements?: PaymentRequirements;
}

export class PaymentOrchestrator implements IPaymentOrchestrator {
  private options: PaymentOrchestratorOptions;
  private logger: ILogger;

  constructor(options: PaymentOrchestratorOptions) {
    this.options = options;
    this.logger = options.loggerFactory.createLogger(PaymentOrchestrator.name);
  }

  /**
   * Validate payment request and response (before handler execution)
   * Throws PaymentError if validation fails
   */
  async validatePayment(
    handlerName: string,
    paymentRequirements: PaymentRequirements,
    extra: RequestHandlerExtra<any, any>
  ): Promise<void> {
    this.logger.info('Validating payment for handler', {
      operation: 'payment_validation_start',
      handlerName: handlerName,
      amount: paymentRequirements.maxAmountRequired
    });

    try {
      // 1. Send payment_required request to client
      const paymentResponse = await this.sendPaymentRequiredRequest(
        paymentRequirements,
        extra
      );

      this.logger.info('Payment required request sent', {
        operation: 'payment_required_request_sent',
        handlerName: handlerName,
        paymentResponse: paymentResponse
      });

      // 2. Validate payment proof and check for replay attacks
      await this.validatePaymentProof(
        paymentResponse,
        paymentRequirements,
        extra
      );

      this.logger.info('Payment validation successful', {
        operation: 'payment_validation_success',
        handlerName: handlerName
      });

    } catch (error) {
      this.logger.error('Payment validation failed', {
        operation: 'payment_validation_failed',
        handlerName: handlerName,
        error: error instanceof Error ? error.message : String(error)
      });

      // Re-throw as PaymentError
      if (error instanceof PaymentError) {
        throw error;
      } else {
        throw new PaymentError(
          ERROR_CODES.PAYMENT_INVALID,
          `Payment validation failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Settle payment after successful handler execution
   * Throws PaymentError if settlement fails
   * Sends success notification on success
   */
  async settlePayment(extra: any): Promise<void> {
    this.logger.info('Settling payment', {
      operation: 'payment_settlement_start'
    });

    try {
      // Get the stored payment proof from the extra context
      // This should have been stored during validatePayment
      const paymentProof = extra.paymentProof;
      const paymentRequirements = extra.paymentRequirements;

      if (!paymentProof || !paymentRequirements) {
        throw new PaymentError(
          ERROR_CODES.PAYMENT_INVALID,
          'Payment proof or requirements not found in context'
        );
      }

      // Execute payment on-chain
      const paymentResult = await this.executePayment(paymentProof, paymentRequirements);

      if (!paymentResult.success) {
        throw new PaymentError(
          ERROR_CODES.PAYMENT_EXECUTION_FAILED,
          `Payment settlement failed: ${paymentResult.errorReason}`
        );
      }

      // Send success notification
      await extra.sendNotification({
        jsonrpc: '2.0',
        method: PaymentResultNotificationSchema.shape.method.value,
        params: {
          success: true,
          transaction: paymentResult.transaction,
          network: paymentResult.network,
          requestId: extra.requestId,
          payer: paymentResult.payer,
        },
      });

      this.logger.info('Payment settled successfully', {
        operation: 'payment_settlement_success',
        transaction: paymentResult.transaction
      });

    } catch (error) {
      this.logger.error('Payment settlement failed', {
        operation: 'payment_settlement_failed',
        error: error instanceof Error ? error.message : String(error)
      });

      // Send failure notification
      await extra.sendNotification({
        jsonrpc: '2.0',
        method: PaymentResultNotificationSchema.shape.method.value,
        params: {
          success: false,
          errorReason: error instanceof Error ? error.message : String(error),
          network: this.options.network,
          requestId: extra.requestId,
        },
      });

      // Re-throw as PaymentError
      if (error instanceof PaymentError) {
        throw error;
      } else {
        throw new PaymentError(
          ERROR_CODES.PAYMENT_EXECUTION_FAILED,
          `Payment settlement failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Sends a payment_required request to the client
   */
  private async sendPaymentRequiredRequest(
    paymentRequirements: PaymentRequirements,
    extra: RequestHandlerExtra<any, any>
  ): Promise<PaymentRequiredResponse> {
    // Build canonical PaymentRequiredRequest using the x402 PaymentRequirementsSchema structure
    const requestId = extra.requestId;
    const paymentRequest: PaymentRequiredRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'x402/payment_required',
      params: {
        scheme: paymentRequirements.scheme,
        network: paymentRequirements.network,
        maxAmountRequired: paymentRequirements.maxAmountRequired,
        resource: paymentRequirements.resource,
        description: paymentRequirements.description,
        mimeType: paymentRequirements.mimeType,
        payTo: paymentRequirements.payTo,
        maxTimeoutSeconds: paymentRequirements.maxTimeoutSeconds,
        asset: paymentRequirements.asset,
        outputSchema: paymentRequirements.outputSchema,
        extra: paymentRequirements.extra,
        x402Version: 1,
        requestId: requestId, // Include the request ID for tracking
      },
    };

    try {
      const response = await extra.sendRequest(paymentRequest, PaymentRequiredResponseSchema);
      return response as PaymentRequiredResponse;
    } catch (error) {
      this.logger.error('Failed to send payment request', {
        operation: 'send_payment_required_request',
        error: error
      });
      // Check if client doesn't support x402-mcp-protocol
      if (this.isMethodNotFoundError(error)) {
        throw new PaymentError(
          ERROR_CODES.PAYMENT_REQUIRED,
          `Payment required: ${paymentRequirements.description || 'Payment is required for this operation'}`,
          {
            amount: paymentRequirements.maxAmountRequired,
            asset: paymentRequirements.asset,
            paymentAddress: this.options.payTo,
            network: this.options.network,
          }
        );
      }
      throw new PaymentError(error.code ? error.code : ERROR_CODES.PAYMENT_INVALID, 'Failed to send payment request', error);
    }
  }

  private isMethodNotFoundError(error: any): boolean {
    return error?.code === -32601 || // JSON-RPC method not found
           error?.message?.includes('Method not found') ||
           error?.message?.includes('method not found');
  }

  /**
   * Validates the payment proof from client response
   */
  private async validatePaymentProof(
    response: PaymentRequiredResponse,
    paymentRequirements: PaymentRequirements,
    extra: PaymentContextExtra
  ): Promise<PaymentPayload> {
    const payment: PaymentPayload = response.result.payment;

    // Basic validation
    if (!payment || !payment.payload?.signature) {
      this.logger.error('Invalid payment proof: missing signature', {
        operation: 'validate_payment_proof',
        payment: payment
      });
      throw new PaymentError(
          ERROR_CODES.PAYMENT_INVALID,
          'Invalid payment proof: missing signature');
    }

    // Validate x402 version
    if (payment.x402Version !== 1) {
      this.logger.error('Invalid x402 version', {
        operation: 'validate_payment_proof',
        payment: payment
      });
      throw new PaymentError(
          ERROR_CODES.INVALID_REQUEST,
          'Invalid x402 version');
    }

    // Validate scheme
    if (payment.scheme !== 'exact') { 
      this.logger.error('Invalid payment scheme', {
        operation: 'validate_payment_proof',
        payment: payment
      });
      throw new PaymentError(
          ERROR_CODES.PAYMENT_INVALID,
          'Invalid payment scheme');
    }

    // Validate network
    if (payment.network !== paymentRequirements.network) {
      this.logger.error('Invalid payment proof: network mismatch', {
        operation: 'validate_payment_proof',
        payment: payment
      });
      throw new PaymentError(
          ERROR_CODES.PAYMENT_INVALID,
          'Invalid payment proof: network mismatch');
    }

    const res = await this.options.facilitator.validatePayment(payment, paymentRequirements);
    if (!res.isValid) {
      this.logger.error('Payment proof validation failed', {
        operation: 'validate_payment_proof',
        payment: payment,
        failReason: res.invalidReason
      });
      throw new PaymentError(
          ERROR_CODES.PAYMENT_INVALID,
          res.invalidReason || 'Payment proof validation failed');
    }

    // Store payment proof and requirements in extra for later settlement
    extra.paymentProof = payment;
    extra.paymentRequirements = paymentRequirements;

    return payment;
  }

  /**
   * Executes the payment on-chain using the facilitator
   */
  private async executePayment(
    paymentProof: PaymentPayload,
    paymentRequirements: PaymentRequirements
  ): Promise<PaymentResult> {
    return await this.options.facilitator.executePayment(
      paymentProof,
      paymentRequirements
    );
  }
}