import { PaymentOrchestrator, PaymentOrchestratorOptions } from '../../../../src/server/services/payments/PaymentOrchestrator';
import { IFacilitatorService } from '../../../../src/server/services/facilitators/IFacilitatorService';
import { ILoggerFactory, ILogger } from '../../../../src/shared/interfaces';
import { PaymentError } from '../../../../src/shared/errors/PaymentError';
import { ERROR_CODES } from '../../../../src/shared/error-codes';
import { PaymentRequirements, PaymentPayload } from 'x402/types';
import { PaymentResult } from '../../../../src/shared/schemas';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

// Mock dependencies
jest.mock('../../../../src/server/services/facilitators/IFacilitatorService');
jest.mock('../../../../src/shared/interfaces');
jest.mock('../../../../src/shared/services');

// Extended extra type to match the implementation
interface PaymentContextExtra extends RequestHandlerExtra<any, any> {
  paymentProof?: PaymentPayload;
  paymentRequirements?: PaymentRequirements;
}

describe('PaymentOrchestrator', () => {
  let orchestrator: PaymentOrchestrator;
  let mockFacilitator: jest.Mocked<IFacilitatorService>;
  let mockLoggerFactory: jest.Mocked<ILoggerFactory>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockExtra: jest.Mocked<PaymentContextExtra>;

  const defaultOptions: PaymentOrchestratorOptions = {
    payTo: '0x1234567890123456789012345678901234567890',
    network: 'base',
    facilitator: {} as IFacilitatorService,
    loggerFactory: {} as ILoggerFactory,
  };

  const mockPaymentRequirements: PaymentRequirements = {
    scheme: 'exact',
    network: 'base',
    maxAmountRequired: '1000000000000000000',
    resource: 'https://example.com/resource',
    description: 'Test payment',
    mimeType: 'application/json',
    payTo: '0x1234567890123456789012345678901234567890',
    maxTimeoutSeconds: 60,
    asset: '0x1234567890123456789012345678901234567890',
    outputSchema: undefined,
    extra: { domain: { name: 'Test Asset', version: '1' } },
  };

  const mockPaymentPayload: PaymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'base',
    payload: {
      signature: '0x1234567890abcdef',
      authorization: {
        from: '0xabcdef1234567890',
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        validAfter: '0',
        validBefore: '9999999999',
        nonce: '0',
      },
    },
  };

  const mockPaymentResponse = {
    jsonrpc: '2.0',
    id: 'test-request-id',
    result: {
      payment: mockPaymentPayload,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<ILogger>;

    mockLoggerFactory = {
      createLogger: jest.fn().mockReturnValue(mockLogger),
    } as jest.Mocked<ILoggerFactory>;

    // Setup mock facilitator
    mockFacilitator = {
      validatePayment: jest.fn(),
      executePayment: jest.fn(),
    } as jest.Mocked<IFacilitatorService>;

    // Setup mock extra
    mockExtra = {
      requestId: 'test-request-id',
      sendRequest: jest.fn(),
      sendNotification: jest.fn(),
      signal: {} as AbortSignal,
    } as jest.Mocked<PaymentContextExtra>;

    // Create orchestrator instance
    orchestrator = new PaymentOrchestrator({
      ...defaultOptions,
      facilitator: mockFacilitator,
      loggerFactory: mockLoggerFactory,
    });
  });

  describe('constructor', () => {
    it('should create logger with correct name', () => {
      expect(mockLoggerFactory.createLogger).toHaveBeenCalledWith('PaymentOrchestrator');
    });
  });

  describe('validatePayment', () => {
    beforeEach(() => {
      mockExtra.sendRequest.mockResolvedValue(mockPaymentResponse);
      mockFacilitator.validatePayment.mockResolvedValue({ isValid: true });
    });

    it('should successfully validate payment', async () => {
      // Act
      await orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra);

      // Assert
      expect(mockExtra.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'x402/payment_required',
          params: expect.objectContaining({
            scheme: 'exact',
            network: 'base',
            maxAmountRequired: '1000000000000000000',
          }),
        }),
        expect.any(Object)
      );

      expect(mockFacilitator.validatePayment).toHaveBeenCalledWith(
        mockPaymentPayload,
        mockPaymentRequirements
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Payment validation successful',
        expect.objectContaining({
          operation: 'payment_validation_success',
          handlerName: 'test-handler',
        })
      );
    });

    it('should store payment proof and requirements in extra context', async () => {
      // Act
      await orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra);

      // Assert
      expect(mockExtra.paymentProof).toBe(mockPaymentPayload);
      expect(mockExtra.paymentRequirements).toBe(mockPaymentRequirements);
    });

    it('should throw PaymentError when client does not support payment', async () => {
      // Arrange
      const methodNotFoundError = { code: -32601, message: 'Method not found' };
      mockExtra.sendRequest.mockRejectedValue(methodNotFoundError);

      // Act & Assert
      await expect(
        orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra)
      ).rejects.toThrow(PaymentError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Payment validation failed',
        expect.objectContaining({
          operation: 'payment_validation_failed',
          handlerName: 'test-handler',
        })
      );
    });

    it('should throw PaymentError when payment proof validation fails', async () => {
      // Arrange
      mockFacilitator.validatePayment.mockResolvedValue({
        isValid: false,
        invalidReason: 'Invalid signature',
      });

      // Act & Assert
      await expect(
        orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra)
      ).rejects.toThrow(PaymentError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Payment validation failed',
        expect.objectContaining({
          operation: 'payment_validation_failed',
          handlerName: 'test-handler',
        })
      );
    });

    it('should throw PaymentError when payment proof is missing signature', async () => {
      // Arrange
      const invalidResponse = {
        ...mockPaymentResponse,
        result: {
          payment: {
            ...mockPaymentPayload,
            payload: { ...mockPaymentPayload.payload, signature: undefined },
          },
        },
      };
      mockExtra.sendRequest.mockResolvedValue(invalidResponse);

      // Act & Assert
      await expect(
        orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra)
      ).rejects.toThrow(PaymentError);
    });

    it('should throw PaymentError when x402 version is invalid', async () => {
      // Arrange
      const invalidResponse = {
        ...mockPaymentResponse,
        result: {
          payment: {
            ...mockPaymentPayload,
            x402Version: 2, // Invalid version
          },
        },
      };
      mockExtra.sendRequest.mockResolvedValue(invalidResponse);

      // Act & Assert
      await expect(
        orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra)
      ).rejects.toThrow(PaymentError);
    });

    it('should throw PaymentError when scheme is invalid', async () => {
      // Arrange
      const invalidResponse = {
        ...mockPaymentResponse,
        result: {
          payment: {
            ...mockPaymentPayload,
            scheme: 'invalid-scheme',
          },
        },
      };
      mockExtra.sendRequest.mockResolvedValue(invalidResponse);

      // Act & Assert
      await expect(
        orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra)
      ).rejects.toThrow(PaymentError);
    });

    it('should throw PaymentError when network does not match', async () => {
      // Arrange
      const invalidResponse = {
        ...mockPaymentResponse,
        result: {
          payment: {
            ...mockPaymentPayload,
            network: 'ethereum', // Different network
          },
        },
      };
      mockExtra.sendRequest.mockResolvedValue(invalidResponse);

      // Act & Assert
      await expect(
        orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra)
      ).rejects.toThrow(PaymentError);
    });
  });

  describe('settlePayment', () => {
    const mockPaymentResult: PaymentResult = {
      success: true,
      transaction: '0xabcdef1234567890',
      network: 'base',
      payer: '0x1234567890123456789012345678901234567890',
    };

    beforeEach(() => {
      mockExtra.paymentProof = mockPaymentPayload;
      mockExtra.paymentRequirements = mockPaymentRequirements;
      mockFacilitator.executePayment.mockResolvedValue(mockPaymentResult);
    });

    it('should successfully settle payment', async () => {
      // Act
      await orchestrator.settlePayment(mockExtra);

      // Assert
      expect(mockFacilitator.executePayment).toHaveBeenCalledWith(
        mockPaymentPayload,
        mockPaymentRequirements
      );

      expect(mockExtra.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'x402/payment_result',
          params: expect.objectContaining({
            success: true,
            transaction: '0xabcdef1234567890',
            network: 'base',
            requestId: 'test-request-id',
            payer: '0x1234567890123456789012345678901234567890',
          }),
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Payment settled successfully',
        expect.objectContaining({
          operation: 'payment_settlement_success',
          transaction: '0xabcdef1234567890',
        })
      );
    });

    it('should throw PaymentError when payment proof is missing', async () => {
      // Arrange
      delete mockExtra.paymentProof;

      // Act & Assert
      await expect(orchestrator.settlePayment(mockExtra)).rejects.toThrow(PaymentError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Payment settlement failed',
        expect.objectContaining({
          operation: 'payment_settlement_failed',
        })
      );
    });

    it('should throw PaymentError when payment requirements are missing', async () => {
      // Arrange
      delete mockExtra.paymentRequirements;

      // Act & Assert
      await expect(orchestrator.settlePayment(mockExtra)).rejects.toThrow(PaymentError);
    });

    it('should throw PaymentError when payment execution fails', async () => {
      // Arrange
      mockFacilitator.executePayment.mockResolvedValue({
        success: false,
        transaction: '0x0000000000000000',
        network: 'base',
        errorReason: 'insufficient_funds',
      });

      // Act & Assert
      await expect(orchestrator.settlePayment(mockExtra)).rejects.toThrow(PaymentError);

      expect(mockExtra.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'x402/payment_result',
          params: expect.objectContaining({
            success: false,
            errorReason: 'Payment settlement failed: insufficient_funds',
            network: 'base',
            requestId: 'test-request-id',
          }),
        })
      );
    });

    it('should send failure notification when facilitator throws error', async () => {
      // Arrange
      const facilitatorError = new Error('Network error');
      mockFacilitator.executePayment.mockRejectedValue(facilitatorError);

      // Act & Assert
      await expect(orchestrator.settlePayment(mockExtra)).rejects.toThrow(PaymentError);

      expect(mockExtra.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'x402/payment_result',
          params: expect.objectContaining({
            success: false,
            errorReason: 'Network error', // The error message is not wrapped
            network: 'base',
            requestId: 'test-request-id',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should wrap non-PaymentError exceptions in PaymentError', async () => {
      // Arrange
      const genericError = new Error('Generic error');
      mockExtra.sendRequest.mockRejectedValue(genericError);

      // Act & Assert
      await expect(
        orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra)
      ).rejects.toThrow(PaymentError);

      // The error is logged twice - once in sendPaymentRequiredRequest and once in validatePayment
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send payment request',
        expect.objectContaining({
          operation: 'send_payment_required_request',
          error: genericError,
        })
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Payment validation failed',
        expect.objectContaining({
          operation: 'payment_validation_failed',
          handlerName: 'test-handler',
          error: 'Failed to send payment request',
        })
      );
    });

    it('should preserve PaymentError when already thrown', async () => {
      // Arrange
      const paymentError = new PaymentError(ERROR_CODES.PAYMENT_INVALID, 'Test error');
      mockExtra.sendRequest.mockRejectedValue(paymentError);

      // Act & Assert
      await expect(
        orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra)
      ).rejects.toThrow(PaymentError);
    });
  });

  describe('logging', () => {
    it('should log payment validation start', async () => {
      // Arrange
      mockExtra.sendRequest.mockResolvedValue(mockPaymentResponse);
      mockFacilitator.validatePayment.mockResolvedValue({ isValid: true });

      // Act
      await orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Validating payment for handler',
        expect.objectContaining({
          operation: 'payment_validation_start',
          handlerName: 'test-handler',
          amount: '1000000000000000000',
        })
      );
    });

    it('should log payment required request sent', async () => {
      // Arrange
      mockExtra.sendRequest.mockResolvedValue(mockPaymentResponse);
      mockFacilitator.validatePayment.mockResolvedValue({ isValid: true });

      // Act
      await orchestrator.validatePayment('test-handler', mockPaymentRequirements, mockExtra);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Payment required request sent',
        expect.objectContaining({
          operation: 'payment_required_request_sent',
          handlerName: 'test-handler',
          paymentResponse: mockPaymentResponse,
        })
      );
    });

    it('should log payment settlement start', async () => {
      // Arrange
      mockExtra.paymentProof = mockPaymentPayload;
      mockExtra.paymentRequirements = mockPaymentRequirements;
      mockFacilitator.executePayment.mockResolvedValue({
        success: true,
        transaction: '0xabcdef1234567890',
        network: 'base',
        payer: '0x1234567890123456789012345678901234567890',
      });

      // Act
      await orchestrator.settlePayment(mockExtra);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Settling payment',
        expect.objectContaining({
          operation: 'payment_settlement_start',
        })
      );
    });
  });
}); 