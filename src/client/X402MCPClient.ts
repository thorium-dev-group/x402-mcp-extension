// X402MCPClient: Core client for X402-MCP extension
// Handles payment_required requests, integrates wallet/notification, enforces guardrails

import { Client, type ClientOptions } from '@modelcontextprotocol/sdk/client/index.js';
import { type Implementation } from '@modelcontextprotocol/sdk/types.js';
import { exact } from 'x402/schemes';
import { processPriceToAtomicAmount } from 'x402/shared';
import type { Network, PaymentRequirements } from 'x402/types';
import type { IStorageInterface, IWalletProvider, ILogger, ILoggerFactory } from '../shared/interfaces';
import { ConsoleLoggerFactory } from '../shared/services';
import { ERROR_CODES } from '../shared/error-codes';
import { PaymentRequiredRequest, PaymentRequiredRequestSchema, PaymentRequiredResponse, PaymentResultNotification, PaymentResultNotificationSchema } from '../shared/schemas';
import { formatUnits } from 'viem';
import { PaymentError } from '../shared/errors/PaymentError';
import { PaymentAuditStorage } from './PaymentAuditStore';

export interface X402MCPClientOptions extends Implementation, ClientOptions {
  
  // X402-specific dependencies
  wallet: IWalletProvider | string; // Can be wallet provider or private key string
  logFactory?: ILoggerFactory; // Logger instance or factory
  auditStorage?: IStorageInterface; // Optional audit storage
  guardrails?: {
    maxPaymentPerCall?: number; // USD amount as float (e.g., 0.01 for $0.01)
    whitelistedServers?: string[];
  };
}

export interface NotificationHandler {
  handleNotification(notification: any): Promise<void>;
}

// GuardrailsService: tracks and enforces spending limits, whitelisting, etc.
class GuardrailsService {
  private maxPaymentPerCall?: number; // USD amount as float
  private whitelistedServers?: string[];
  private log: ILogger;

  constructor(opts: { loggerFactory: ILoggerFactory, guardrails?: X402MCPClientOptions['guardrails'] }) {
    this.maxPaymentPerCall = opts.guardrails?.maxPaymentPerCall;
    this.whitelistedServers = opts.guardrails?.whitelistedServers;
    this.log = opts.loggerFactory.createLogger(GuardrailsService.name);
  }

  /**
   * Enforce per-payment guardrails (per-call limit and whitelisting)
   * @param amount - USD amount as float (e.g., 0.001 for $0.001)
   * @param payTo - Payment recipient address
   */
  async enforce({ amount, payTo }: { amount: number; payTo: string }) {
    // Enforce per-call limit (amount is already in USD)
    if (this.maxPaymentPerCall !== undefined && amount > this.maxPaymentPerCall) {
      this.log.error('Payment exceeds max per-call limit', {
        amountRequested: amount,
        maxPaymentPerCall: this.maxPaymentPerCall
      });
      throw new PaymentError(
        ERROR_CODES.GUARDRAIL_VIOLATION,
        `Payment exceeds max per-call limit: $${amount} > $${this.maxPaymentPerCall}`,
        { amount, maxPaymentPerCall: this.maxPaymentPerCall }
      );
    }
    // Enforce whitelisting
    if (this.whitelistedServers && !this.whitelistedServers.includes(payTo)) {
      this.log.error('Payment recipient is not whitelisted', {
        payTo,
        whitelistedServers: this.whitelistedServers
      });
      throw new PaymentError(
        ERROR_CODES.WHITELIST_VIOLATION,
        `Payment recipient ${payTo} is not whitelisted`,
        { payTo, whitelistedServers: this.whitelistedServers }
      );
    }
  }
}

export class X402MCPClient extends Client implements NotificationHandler {
  private walletProvider: IWalletProvider;
  private guardrailsService?: GuardrailsService;
  private auditStorage?: PaymentAuditStorage;
  private logger: ILogger;

  /**
   * Constructs an X402MCPClient with explicit dependencies.
   * @param options - X402MCPClientOptions with simplified configuration
   */
  constructor(options: X402MCPClientOptions) {
    super({
      name: options.name,
      version: options.version,
    }, {
      capabilities: {
        ...options.capabilities,
        experimental: {
          x402: {
            paymentsEnabled: true,
          },
        }
      }
    });

    // Initialize wallet provider
    if (typeof options.wallet === 'string') {
      // If wallet is a string, assume it's a private key and create a wallet provider
      const { X402PKWalletProvider } = require('./x402PKWalletProvider');
      this.walletProvider = new X402PKWalletProvider(options.wallet);
    } else {
      this.walletProvider = options.wallet;
    }

    if(!options.logFactory) {
      options.logFactory = new ConsoleLoggerFactory();
    }
    
    // Initialize logger
    if (options.logFactory) {
      this.logger = options.logFactory.createLogger(X402MCPClient.name);
    } else {
      // Use default console logger
      const loggerFactory = new ConsoleLoggerFactory();
      this.logger = loggerFactory.createLogger(X402MCPClient.name);
    }
    
    // Initialize guardrails service if configured
    if (options.guardrails) {
      this.guardrailsService = new GuardrailsService({
        guardrails: options.guardrails,
        loggerFactory: options.logFactory,
      });
    }

    // Initialize audit storage if provided
    if (options.auditStorage) {
      this.auditStorage = new PaymentAuditStorage({
        storage: options.auditStorage
      });
    }

    // Set up request and notification handlers
    this.setRequestHandler(PaymentRequiredRequestSchema, this.handlePaymentRequired.bind(this));
    this.setNotificationHandler(PaymentResultNotificationSchema, this.handleNotification.bind(this));
  }

  /**
   * Override connect to intercept the transport's send function for request tracking
   */
  async connect(transport: any): Promise<void> {
    // Only intercept if we have audit storage
    if (this.auditStorage) {
      // Intercept the transport's send function to capture request IDs
      const originalSend = transport.send.bind(transport);
      const serverUrl = transport.url;
      transport.send = async (message: any, options?: any) => {
        // Capture the request ID from the outgoing message
        const requestId = message.id;
        const method = message.method;
        const params = message.params;
        
        if (requestId && method) {
          // Track the request in our audit storage
          await this.trackRequest(requestId, serverUrl, method, params);
        }
        
        // Call the original send function
        try {
          const result = await originalSend(message, options);
          
          // Mark the request as completed
          if (requestId) {
            await this.markRequestCompleted(requestId);
          }
          
          return result;
        } catch (error) {
          this.logger.error('Error sending request', {
            operation: 'send_request',
            error: error
          });
          // Mark the request as completed even if it failed
          if (requestId) {
            await this.markRequestCompleted(requestId);
          }
          throw error;
        }
      };
    }
    
    // Call the original connect method
    return super.connect(transport);
  }

  /**
   * Track a new request in the audit trail
   */
  private async trackRequest(requestId: string, serverId: string, method: string, params?: any): Promise<void> {
    if (this.auditStorage) {
      await this.auditStorage.storePendingRequest({
        requestId,
        serverId,
        method,
        params,
      });
    }
  }

  /**
   * Mark a request as completed
   */
  private async markRequestCompleted(requestId: string): Promise<void> {
    if (this.auditStorage) {
      await this.auditStorage.markRequestCompleted(requestId);
    }
  }

  /**
   * Handle payment required requests with audit trail validation
   */
  async handlePaymentRequired(request: PaymentRequiredRequest): Promise<PaymentRequiredResponse> {
    const params = request.params;
    
    // 1. Validate payment details (basic checks)
    if (!params || !params.payTo || !params.maxAmountRequired || !params.network) {
      throw new Error('Invalid payment_required request: missing required fields');
    }

    if(request.params.scheme !== 'exact') {
      throw new Error('Unsupported scheme: ' + request.params.scheme);
    }

    if(request.params.x402Version !== 1) {
      throw new Error('Unsupported x402 version: ' + request.params.x402Version);
    }

    // 2. Find the corresponding tracked request by paymentId
    const requestId = params.requestId;
    if (!requestId) {
      throw new PaymentError(
        ERROR_CODES.PAYMENT_INVALID,
        'Payment request missing requestId'
      );
    }

    // Find the tracked request that has this paymentId, or find a pending request without a paymentId
    let matchingRequest = null;
    if (this.auditStorage) {
      matchingRequest = await this.auditStorage.getPendingRequest(requestId);
      
      if (!matchingRequest) {
        throw new PaymentError(
          ERROR_CODES.PAYMENT_INVALID,
          `Payment request for unknown payment: ${requestId}`
        );
      }

      this.logger.debug('Making payment for request:', matchingRequest, params);

      // 3. Update the audit record with payment details
      await this.auditStorage.updatePaymentStatus(requestId, 'pending', {
        completedAt: new Date(),
      });
    }

    // 4. Enforce guardrails if configured
    if (this.guardrailsService) {
      // Convert the atomic amount back to USD for guardrails using viem's formatUnits
      const atomicAmount = processPriceToAtomicAmount(
        params.maxAmountRequired,
        params.network as Network
      );
      
      if ('error' in atomicAmount) {
        this.logger.error('Failed to process payment amount', {
          operation: 'handle_payment_required',
          error: atomicAmount.error
        });
        throw new PaymentError(
          ERROR_CODES.PAYMENT_INVALID,
          `Failed to process payment amount: ${atomicAmount.error}`
        );
      }
      
      // Convert atomic units to USD using viem's formatUnits
      const usdAmount = parseFloat(formatUnits(BigInt(params.maxAmountRequired), atomicAmount.asset.decimals));
      
      await this.guardrailsService.enforce({
        amount: usdAmount,
        payTo: params.payTo,
      });
    }

    // 5. Create viem account from wallet provider
    const account = await this.walletProvider.createAccount();

    // 6. Use x402's createPayment utility which handles everything (nonce, signing, etc.)
    const paymentPayload = await exact.evm.createPayment(account, params.x402Version!, params as PaymentRequirements);

    // 7. Build the response
    const response: PaymentRequiredResponse = {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        payment: paymentPayload,
      },
    };

    // 8. Return the response object
    return response;
  }

  /**
   * Handle parsed notifications (implements NotificationHandler)
   * This will be called with parsed notification objects.
   */
  async handleNotification(notification: PaymentResultNotification): Promise<void> {
    const params = notification.params;
    
    // Update payment status based on notification
    if (params.requestId && this.auditStorage) {
      // Find the request by paymentId (we need to search through pending requests)
      const matchingRequest = await this.auditStorage.getPendingRequest(params.requestId);
      
      if (matchingRequest) {
        await this.auditStorage.updatePaymentStatus(matchingRequest.requestId, params.success ? 'completed' : 'failed', {
          transactionHash: params.transaction,
          payerAddress: params.payer,
          errorReason: params.errorReason,
          completedAt: new Date(),
        });
      }
    }
    
    // Log or handle payment result notifications as needed
    this.logger.debug('Received payment result notification:', notification);
  }
} 