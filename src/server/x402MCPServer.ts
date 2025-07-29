import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { HandlerRegistry, HandlerWrapperFactory, type HandlerClass } from './services/handlers';
import { PaymentOrchestrator } from './services/payments/PaymentOrchestrator';
import type { ILogger, ILoggerFactory, IStorageInterface } from '../shared/interfaces';
import { ConsoleLoggerFactory } from '../shared/services';
import { Network } from 'x402/types';
import { IFacilitatorService } from './services/facilitators/IFacilitatorService';



export interface X402Config {
  payTo: string;
  network: Network;
  facilitator: IFacilitatorService;
  baseMCPServerDomain: string; // Base URL for constructing resource URLs in payment requirements
}

export interface ServerConfig {
  name: string;
  version: string;
  x402Config: X402Config;
  storage?: IStorageInterface; // Direct storage injection
  loggerFactory?: ILoggerFactory; // Logger factory injection
  sessionId?: string; // Session ID for logging
}

export interface PaymentConfig {
  payTo: string;
  network: Network;
  maxTimeoutSeconds: number;
}


export class X402MCPServer extends McpServer {
  private paymentOrchestrator: PaymentOrchestrator;
  private logger: ILogger;
  private handlerClasses: HandlerClass[] = [];


  constructor(readonly options: ServerConfig) {
    super({
      name: options.name,
      version: options.version,
      capabilities: {
        experimental: {
          x402: {
            paymentsEnabled: true,
          },
        },
      },
    });
    
    
    // Initialize logger (use provided logger factory or create default console logger)
    const loggerFactory = options.loggerFactory || new ConsoleLoggerFactory();
    this.logger = loggerFactory.createLogger(X402MCPServer.name, {
      sessionId: options.sessionId,
    });
    
    // Create payment orchestrator instance (not singleton)
    this.paymentOrchestrator = new PaymentOrchestrator({
      payTo: options.x402Config.payTo,
      network: options.x402Config.network,
      facilitator: options.x402Config.facilitator,
      loggerFactory: loggerFactory,
    });
  }

  /**
   * Register handler classes with the server
   * Each handler class will be instantiated per session
   */
  registerHandlers(...handlerClasses: HandlerClass[]): void {
    this.handlerClasses.push(...handlerClasses);
    this.logger.info('Registered handler classes', { 
      count: handlerClasses.length,
      totalHandlers: this.handlerClasses.length 
    });
  }

  async connect(transport: Transport): Promise<void> {
    this.logger.info('X402MCPServer connecting to transport');
    await this.registerSessionHandlers();
    this.logger.info('Session handlers registered, connecting to transport');
    return super.connect(transport);
  }

  /**
   * Creates session-specific handler instances and registers them with the MCP server
   */
  async registerSessionHandlers() {
    this.logger.info('Creating session handlers', { 
      handlerClasses: this.handlerClasses.length 
    });

    if (this.handlerClasses.length === 0) {
      this.logger.warn('No handler classes registered');
      return;
    }

    // Create session-specific handler instances
    const sessionHandlers = HandlerRegistry.createSessionHandlers(this.handlerClasses);
    
    this.logger.info('Session handlers created', {
      tools: sessionHandlers.tools.length,
      prompts: sessionHandlers.prompts.length,
      resources: sessionHandlers.resources.length,
      resourceTemplates: sessionHandlers.resourceTemplates.length
    });

    // Create wrapper context
    const context = {
      x402Config: {
        payTo: this.options.x402Config.payTo,
        network: this.options.x402Config.network,
        baseUrl: this.options.x402Config.baseMCPServerDomain,
      },
      paymentOrchestrator: this.paymentOrchestrator,
      logger: this.logger,
    };

    // Register tools
    for (const toolInfo of sessionHandlers.tools) {
      const wrappedTool = HandlerWrapperFactory.createToolWrapper(toolInfo, context);
      const toolOptions = toolInfo.options as any;
      
      // Add payment info to description if payment is required
      let description = toolOptions.description || toolInfo.name;
      if (toolInfo.paymentOptions) {
        description += ` (fee: ${toolInfo.paymentOptions.amount} USD)`;
      }

      // Merge payment info into annotations if payment is required
      let annotations: any = toolOptions.annotations || {};
      if (toolInfo.paymentOptions) {
        annotations = {
          ...annotations,
          feeUSD: toolInfo.paymentOptions.amount,
        };
      }

      if (toolOptions.inputSchema) {
        this.tool(
          toolInfo.name,
          description,
          toolOptions.inputSchema,
          annotations,
          wrappedTool
        );
      } else {
        this.tool(
          toolInfo.name,
          description,
          annotations,
          wrappedTool
        );
      }
      this.logger.debug('Registered tool', { name: toolInfo.name });
    }

    // Register prompts
    for (const promptInfo of sessionHandlers.prompts) {
      const wrappedPrompt = HandlerWrapperFactory.createPromptWrapper(promptInfo, context);
      const promptOptions = promptInfo.options as any;
      
      // Add payment info to description if payment is required
      let description = promptOptions.description || promptInfo.name;
      if (promptInfo.paymentOptions) {
        description += ` (fee: ${promptInfo.paymentOptions.amount} USD)`;
      }

      if (promptOptions.argsSchema) {
        this.prompt(
          promptInfo.name,
          description,
          promptOptions.argsSchema,
          wrappedPrompt
        );
      } else {
        this.prompt(
          promptInfo.name,
          description,
          wrappedPrompt
        );
      }
      this.logger.debug('Registered prompt', { name: promptInfo.name });
    }

    // Register resources
    for (const resourceInfo of sessionHandlers.resources) {
      const wrappedResource = HandlerWrapperFactory.createResourceWrapper(resourceInfo, context);
      const resourceOptions = resourceInfo.options as any;
      
      // Add payment info to description if payment is required
      let description = resourceOptions.description || resourceInfo.name;
      if (resourceInfo.paymentOptions) {
        description += ` (fee: ${resourceInfo.paymentOptions.amount} USD)`;
      }

      this.resource(
        resourceInfo.name,
        resourceOptions.uri,
        {
          description: description,
          mimeType: resourceOptions.mimeType,
          title: resourceOptions.title,
        },
        wrappedResource
      );
      this.logger.debug('Registered resource', { name: resourceInfo.name });
    }

    // Register resource templates
    for (const templateInfo of sessionHandlers.resourceTemplates) {
      const wrappedTemplate = HandlerWrapperFactory.createResourceTemplateWrapper(templateInfo, context);
      const templateOptions = templateInfo.options as any;
      
      // Add payment info to description if payment is required
      let description = templateOptions.description || templateInfo.name;
      if (templateInfo.paymentOptions) {
        description += ` (fee: ${templateInfo.paymentOptions.amount} USD)`;
      }

      // Create ResourceTemplate instance
      const { ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
      const template = new ResourceTemplate(
        templateOptions.template,
        {
          list: templateOptions.listCallback,
          complete: templateOptions.completeCallbacks,
        }
      );

      this.resource(
        templateInfo.name,
        template,
        {
          description: description,
          mimeType: templateOptions.mimeType,
          title: templateOptions.title,
        },
        wrappedTemplate
      );
      this.logger.debug('Registered resource template', { name: templateInfo.name });
    }

    this.logger.info('Session handlers registration complete', {
      totalHandlers: sessionHandlers.tools.length + sessionHandlers.prompts.length + 
                    sessionHandlers.resources.length + sessionHandlers.resourceTemplates.length
    });
  }
} 