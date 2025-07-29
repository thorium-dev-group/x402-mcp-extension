# X402-MCP Extension

A Model Context Protocol (MCP) extension that integrates X402 payment protocol, enabling AI assistants to request and process payments for their services.

## ⚠️ Experimental Software Disclaimer

**This is experimental software and should be used at your own risk.**

- **Early Stage Development**: This codebase is in early development and has not been extensively tested in production environments or live payment scenarios.
- **Payment Processing Risk**: This software handles real financial transactions. Use with extreme caution and only with small amounts in test environments.
- **No Warranty**: This software is provided "as is" without any warranties. The authors are not responsible for any financial losses or damages.
- **Security Considerations**: While security measures are implemented, this software has not undergone comprehensive security audits for production use.
- **Testing Status**: Limited real-world testing has been performed. Thorough testing is recommended before any production deployment.

**For production use, conduct your own security audit and testing.**

## Overview

The X402-MCP Extension bridges the gap between AI assistants and payment processing by implementing the X402 payment protocol within the Model Context Protocol. This allows AI services to:

- **Request payments** for premium features or computational resources
- **Process payments** securely through various facilitators (Coinbase, mock services, etc.)
- **Enforce guardrails** like spending limits and whitelisted servers
- **Audit payment history** for transparency and compliance

## Features

- 🔐 **Secure Payment Processing**: Integrates with X402 protocol for secure, on-chain payments
- 🛡️ **Guardrails**: Configurable spending limits and server whitelisting
- 📊 **Payment Auditing**: Track and audit all payment transactions
- 🎯 **Decorator-based API**: Simple decorators to mark tools as payment-required
- 🔌 **Multiple Facilitators**: Support for Coinbase, mock services, and custom facilitators
- 📝 **Comprehensive Logging**: Detailed logging for debugging and monitoring

## Installation

```bash
npm install @thorium-dev-group/x402-mcp-extension
```

## Quick Start

### Server Setup

```typescript
import { X402MCPServer } from '@thorium-dev-group/x402-mcp-extension';
import { MockFacilitatorService } from '@thorium-dev-group/x402-mcp-extension';
import { Network } from 'x402/types';

// Create server configuration
const serverConfig = {
  name: 'my-x402-server',
  version: '1.0.0',
  x402Config: {
    payTo: '0x1234567890123456789012345678901234567890', // Your wallet address
    network: 'base-sepolia' as Network,
    facilitator: new MockFacilitatorService(true, true), // Use CoinbaseFacilitatorService for production
    baseMCPServerDomain: 'https://your-server.com',
  },
};

// Create and configure the server
const mcpServer = new X402MCPServer(serverConfig);

// Register your handler classes
mcpServer.registerHandlers(MyCalculatorService);

// Connect to transport
await mcpServer.connect(transport);
```

### Client Setup

```typescript
import { X402MCPClient } from '@thorium-dev-group/x402-mcp-extension';
import { X402PKWalletProvider } from '@thorium-dev-group/x402-mcp-extension';

// Create wallet provider
const privateKey = 'your-private-key'; // Get from environment or secure storage
const walletProvider = new X402PKWalletProvider(privateKey);

// Create client
const client = new X402MCPClient({
  name: 'my-x402-client',
  version: '1.0.0',
  wallet: walletProvider,
  guardrails: {
    maxPaymentPerCall: 0.01, // $0.01 USD max per call
    whitelistedServers: ['0x1234567890123456789012345678901234567890'],
  },
});

// Connect to server
await client.connect(transport);
```

## Creating Payment-Required Tools

Use the `@MCPTool` decorator to mark methods as payment-required:

```typescript
import { MCPTool } from '@thorium-dev-group/x402-mcp-extension';
import { z } from 'zod';

export class MyCalculatorService {
  @MCPTool({
    name: 'advanced-calculator',
    description: 'Advanced mathematical operations with payment',
    inputSchema: {
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    },
    payment: {
      amount: 0.001, // $0.001 USD
      description: 'Payment for advanced calculation service',
    },
  })
  async calculate(args: any) {
    let result: number;
    switch (args.operation) {
      case 'add':
        result = args.a + args.b;
        break;
      case 'subtract':
        result = args.a - args.b;
        break;
      case 'multiply':
        result = args.a * args.b;
        break;
      case 'divide':
        result = args.a / args.b;
        break;
      default:
        throw new Error(`Unknown operation: ${args.operation}`);
    }

    return {
      content: [{ type: 'text', text: `Result: ${result}` }],
    };
  }

  @MCPTool({
    name: 'free-calculator',
    description: 'Basic calculator (free)',
    inputSchema: {
      a: z.number(),
      b: z.number(),
    },
    // No payment required
  })
  async freeCalculate(args: any) {
    return {
      content: [{ type: 'text', text: `Sum: ${args.a + args.b}` }],
    };
  }
}
```

## Payment Facilitators

The extension supports multiple payment facilitators:

### Mock Facilitator (Development)

```typescript
import { MockFacilitatorService } from '@thorium-dev-group/x402-mcp-extension';

const facilitator = new MockFacilitatorService(
  true,  // autoApprove
  true   // autoSettle
);
```

### Coinbase Facilitator (Production)

```typescript
import { CoinbaseFacilitatorService } from '@thorium-dev-group/x402-mcp-extension';

const facilitator = new CoinbaseFacilitatorService({
  apiKey: process.env.COINBASE_API_KEY,
  apiSecret: process.env.COINBASE_API_SECRET,
  // Additional configuration...
});
```

## Guardrails and Security

Configure guardrails to protect against excessive spending:

```typescript
const client = new X402MCPClient({
  // ... other options
  guardrails: {
    maxPaymentPerCall: 0.01, // $0.01 USD maximum per call
    whitelistedServers: [
      '0x1234567890123456789012345678901234567890',
      '0x0987654321098765432109876543210987654321',
    ],
  },
});
```

## Payment Auditing

Track all payment transactions:

```typescript
import { InMemoryStorage } from '@thorium-dev-group/x402-mcp-extension';

const client = new X402MCPClient({
  // ... other options
  auditStorage: InMemoryStorage.getInstance(), // Or your custom storage
});
```

## Error Handling

The extension provides comprehensive error handling with specific error codes:

```typescript
try {
  const result = await client.callTool({
    name: 'paid-service',
    arguments: { data: 'test' },
  });
} catch (error) {
  if (error.code) {
    switch (error.code) {
      case ERROR_CODES.PAYMENT_REQUIRED:
        // Handle payment requirement
        console.log('Payment required:', error.details);
        break;
      case ERROR_CODES.GUARDRAIL_VIOLATION:
        // Handle guardrail violation (spending limit exceeded)
        console.log('Payment exceeds limit:', error.details);
        break;
      case ERROR_CODES.WHITELIST_VIOLATION:
        // Handle whitelist violation
        console.log('Server not whitelisted:', error.details);
        break;
      case ERROR_CODES.PAYMENT_INVALID:
        // Handle invalid payment
        console.log('Invalid payment:', error.details);
        break;
      case ERROR_CODES.INSUFFICIENT_PAYMENT:
        // Handle insufficient payment amount
        console.log('Insufficient payment:', error.details);
        break;
      case ERROR_CODES.REPLAY_DETECTED:
        // Handle replay attack
        console.log('Payment replay detected:', error.details);
        break;
      case ERROR_CODES.PAYMENT_EXECUTION_FAILED:
        // Handle on-chain payment failure
        console.log('Payment execution failed:', error.details);
        break;
      default:
        console.log('Unknown payment error:', error.message);
    }
  } else {
    // Handle other types of errors
    console.error('error:', error);
  }
}
```

### Error Codes

The extension uses the following error codes:

- `40200` - **PAYMENT_REQUIRED**: Payment is required for this operation
- `40201` - **PAYMENT_INVALID**: Invalid payment proof or requirements
- `40202` - **INSUFFICIENT_PAYMENT**: Payment amount is insufficient
- `40203` - **REPLAY_DETECTED**: Payment proof has already been used
- `40204` - **PAYMENT_EXECUTION_FAILED**: Payment execution failed on-chain
- `40210` - **GUARDRAIL_VIOLATION**: Payment blocked by guardrail (spending limit, etc.)
- `40211` - **WHITELIST_VIOLATION**: Payment recipient not in whitelist

## Examples

### Complete Server Example

```typescript
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { X402MCPServer } from '@thorium-dev-group/x402-mcp-extension';
import { MockFacilitatorService } from '@thorium-dev-group/x402-mcp-extension';
import { Network } from 'x402/types';

const app = express();
app.use(express.json());

const sessions = new Map();

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string || randomUUID();
  
  if (!sessions.has(sessionId)) {
    // Create new session
    const serverConfig = {
      name: 'x402-server',
      version: '1.0.0',
      x402Config: {
        payTo: '0x1234567890123456789012345678901234567890',
        network: 'base-sepolia' as Network,
        facilitator: new MockFacilitatorService(true, true),
        baseMCPServerDomain: 'https://your-server.com',
      },
    };

    const mcpServer = new X402MCPServer(serverConfig);
    mcpServer.registerHandlers(MyCalculatorService);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
    });

    await mcpServer.connect(transport);
    sessions.set(sessionId, { mcpServer, transport });
  }

  const session = sessions.get(sessionId);
  await session.transport.handleRequest(req, res, req.body);
});

app.listen(3000, () => {
  console.log('X402 MCP Server running on port 3000');
});
```

### Complete Client Example

```typescript
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { X402MCPClient, X402PKWalletProvider } from '@thorium-dev-group/x402-mcp-extension';

async function main() {
  const walletProvider = new X402PKWalletProvider(process.env.PRIVATE_KEY);
  
  const client = new X402MCPClient({
    name: 'x402-client',
    version: '1.0.0',
    wallet: walletProvider,
    guardrails: {
      maxPaymentPerCall: 0.01,
    },
  });

  const transport = new StreamableHTTPClientTransport(
    new URL('http://localhost:3000/mcp')
  );

  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: 'advanced-calculator',
      arguments: { operation: 'add', a: 5, b: 3 },
    });
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }

  await transport.close();
}

main().catch(console.error);
```

## API Reference

### Server Classes

- **`X402MCPServer`**: Main server class that extends MCP server with X402 payment capabilities
- **`PaymentOrchestrator`**: Handles payment processing and coordination

### Client Classes

- **`X402MCPClient`**: Main client class that handles payment requirements and processing
- **`X402PKWalletProvider`**: Wallet provider for private key-based wallets

### Decorators

- **`@MCPTool`**: Decorator to mark methods as MCP tools with optional payment requirements
- **`@MCPResource`**: Decorator for MCP resources
- **`@MCPPrompt`**: Decorator for MCP prompts

### Services

- **`MockFacilitatorService`**: Mock payment facilitator for development
- **`CoinbaseFacilitatorService`**: Coinbase payment facilitator for production
- **`InMemoryStorage`**: In-memory storage for payment auditing

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Running Examples

```bash
# Terminal 1: Start server
npm run run-server

# Terminal 2: Run client
npm run run-client
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For questions and support, please open an issue on GitHub or contact the development team. 