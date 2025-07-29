import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { X402MCPClient } from '../../client/X402MCPClient';
import { X402PKWalletProvider } from '../../client/x402PKWalletProvider';
import { generatePrivateKey } from 'viem/accounts';
import { InMemoryStorage } from '../../shared/services/InMemoryStorage';

async function simpleClientExample() {
  console.log('🚀 Simple X402 MCP Client Example');

  // Option 1: Using a wallet provider instance
  const privateKey = generatePrivateKey();
  const walletProvider = new X402PKWalletProvider(privateKey);

  const client1 = new X402MCPClient({
    name: 'client-with-provider', 
    version: '1.0.0',
    wallet: walletProvider,
    auditStorage: InMemoryStorage.getInstance(),
  });

  // Option 2: Using a private key string directly
  const client2 = new X402MCPClient({
    clientInfo: { 
      name: 'client-with-private-key', 
      version: '1.0.0' 
    },
    wallet: generatePrivateKey(), // Private key as string
    guardrails: {
      maxPaymentPerCall: 0.01, // $0.01 USD max per call
    },
  });

  // Option 3: Minimal configuration (no audit storage, no guardrails)
  const client3 = new X402MCPClient({
    clientInfo: { 
      name: 'minimal-client', 
      version: '1.0.0' 
    },
    wallet: generatePrivateKey(),
  });

  console.log('✅ Created three different client configurations');
  console.log('📋 Client 1: Full configuration with audit storage');
  console.log('📋 Client 2: With guardrails, no audit storage');
  console.log('📋 Client 3: Minimal configuration');

  // Example: Connect and use client1
  const transport = new StreamableHTTPClientTransport(new URL('http://localhost:3000/mcp'));
  await client1.connect(transport);

  try {
    // Test a simple tool call
    const result = await client1.callTool({
      name: 'free-calculator',
      arguments: { operation: 'add', a: 5, b: 3 }
    });
    console.log('✅ Tool call result:', result);
  } catch (error) {
    console.log('❌ Tool call failed:', error.message);
  } finally {
    await transport.close();
  }
}

// Run the example
simpleClientExample().catch(console.error); 