import type { PromptCallback, ReadResourceCallback, ReadResourceTemplateCallback, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PaymentError } from '../../../shared/errors/PaymentError';
import { HandlerInfo } from './handler-registry';
import { assemblePaymentRequirements } from './payment-utils';

export interface HandlerWrapperContext {
  paymentOrchestrator: any; // Will be PaymentOrchestrator instance
  x402Config: {
    payTo: string;
    network: string;
    baseUrl?: string;
  };
  logger: any; // Will be ILogger instance
}

export class HandlerWrapperFactory {
  /**
   * Creates a wrapped tool handler with payment orchestration
   */
  static createToolWrapper(
    handlerInfo: HandlerInfo,
    context: HandlerWrapperContext
  ): ToolCallback {
    // Check if tool has input schema to determine signature
    const hasInputSchema = handlerInfo.options && 'inputSchema' in handlerInfo.options && 
      handlerInfo.options.inputSchema && Object.keys(handlerInfo.options.inputSchema).length > 0;
    
    if (hasInputSchema) {
      // With schema: (args: any, extra: any)
      return async (args, extra) => {
        return await this.createWrappedHandler(handlerInfo, context, args, extra);
      };
    } else {
      // Without schema: (extra: any)
      return async (extra) => {
        return await this.createWrappedHandler(handlerInfo, context, {}, extra);
      };
    }
  }

  /**
   * Creates a wrapped prompt handler with payment orchestration
   */
  static createPromptWrapper(
    handlerInfo: HandlerInfo,
    context: HandlerWrapperContext
  ): PromptCallback {
    // Prompts always expect: (args: any, extra: any)
    return async (args, extra) => {
      return await this.createWrappedHandler(handlerInfo, context, args, extra);
    };
  }

  /**
   * Creates a wrapped resource handler with payment orchestration
   */
  static createResourceWrapper(
    handlerInfo: HandlerInfo,
    context: HandlerWrapperContext
  ): ReadResourceCallback {
    // Resources expect: (uri: URL, extra: any)
    return async (uri, extra) => {
      return await this.createWrappedHandler(handlerInfo, context, { uri }, extra);
    };
  }

  /**
   * Creates a wrapped resource template handler with payment orchestration
   */
  static createResourceTemplateWrapper(
    handlerInfo: HandlerInfo,
    context: HandlerWrapperContext
  ): ReadResourceTemplateCallback {
    // Resource templates expect: (uri: URL, variables: any, extra: any)
    return async (uri, variables, extra) => {
      return await this.createWrappedHandler(handlerInfo, context, { uri, variables }, extra);
    };
  }

  /**
   * Main wrapper logic that handles payment flow and developer handler execution
   */
  private static async createWrappedHandler(
    handlerInfo: HandlerInfo,
    context: HandlerWrapperContext,
    args: any,
    extra: any
  ): Promise<any> {
    try {
      // Step 1: Validate payment if required (BEFORE calling developer code)
      if (handlerInfo.paymentOptions) {
        context.logger.info('Validating payment for handler', {
          operation: 'payment_validation_start',
          handlerName: handlerInfo.name,
          amount: handlerInfo.paymentOptions.amount
        });

        // Assemble payment requirements
        const resourcePath = `/tools/${handlerInfo.name}`; // Default path for tools
        const paymentRequirements = assemblePaymentRequirements(
          handlerInfo.paymentOptions,
          resourcePath,
          context.x402Config,
          context.x402Config.baseUrl
        );

        // Validate payment - throws PaymentError if validation fails
        await context.paymentOrchestrator.validatePayment(
          handlerInfo.name,
          paymentRequirements,
          extra
        );

        context.logger.info('Payment validation successful', {
          operation: 'payment_validation_success',
          handlerName: handlerInfo.name
        });
      }

      // Step 2: Call developer-supplied handler
      context.logger.info('Executing developer handler', {
        operation: 'handler_execution_start',
        handlerName: handlerInfo.name
      });

      // Call the handler with the correct arguments based on type
      let result: any;
      if (handlerInfo.type === 'resource') {
        // Resource handlers expect (uri, extra)
        result = await handlerInfo.handler(args.uri, extra);
      } else if (handlerInfo.type === 'resourceTemplate') {
        // Resource template handlers expect (uri, variables, extra)
        result = await handlerInfo.handler(args.uri, args.variables, extra);
      } else {
        // Tool and prompt handlers expect (args, extra)
        result = await handlerInfo.handler(args, extra);
      }

      context.logger.info('Developer handler executed successfully', {
        operation: 'handler_execution_success',
        handlerName: handlerInfo.name
      });

      // Step 3: Settle payment on successful outcome (AFTER developer code succeeds)
      if (handlerInfo.paymentOptions) {
        context.logger.info('Settling payment after successful handler execution', {
          operation: 'payment_settlement_start',
          handlerName: handlerInfo.name
        });

        // Settle payment - throws PaymentError if settlement fails, sends notification on success
        await context.paymentOrchestrator.settlePayment(extra);

        context.logger.info('Payment settled successfully', {
          operation: 'payment_settlement_success',
          handlerName: handlerInfo.name
        });
      }

      return result;

    } catch (error) {
      

      // Handle different types of errors
      if (error instanceof PaymentError) {
        // Payment-related error - don't settle payment, propagate error to client
        context.logger.error('Payment processing failed', {
          operation: 'payment_failed',
          handlerName: handlerInfo.name,
          error: error.message
        });

        // Payment orchestrator handles its own notifications, just propagate the error
        throw error;

      } else {
        // Developer code failed - don't settle payment, propagate error to client
        context.logger.error('Handler execution failed', {
          operation: 'handler_execution_failed',
          handlerName: handlerInfo.name,
          error: error instanceof Error ? error.message : String(error)
        });

        // Re-throw as processing error (not payment error)
        throw new Error(`Handler execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      //remove so that we don't expose to any other MCP code
      if (extra) {
        delete extra.paymentProof;
        delete extra.paymentRequirements;
      }
    }
  }
} 