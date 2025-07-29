import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { X402MCPClient } from '../../client/X402MCPClient';
import { X402PKWalletProvider } from '../../client/x402PKWalletProvider';
import { generatePrivateKey } from 'viem/accounts';
import { InMemoryStorage } from '../../shared/services/InMemoryStorage';

async function testClientServerCommunication() {
  console.log('🚀 Starting X402 MCP Client Test');
  
  // Create a wallet provider
  //NOTE: you would normally get PK from environment or some other secrets manager
  const privateKey = generatePrivateKey();
  //we're using just a standard private key wallet but we could have a more 
  //advanced solution such as KMS
  const viemWalletProvider = new X402PKWalletProvider(privateKey);

  // Create client with simplified X402 configuration
  const client = new X402MCPClient({
    name: 'test-x402-client', 
    version: '1.0.0',
    wallet: viemWalletProvider, // Direct wallet provider
    auditStorage: InMemoryStorage.getInstance(), // Optional audit storage
    guardrails: {
      maxPaymentPerCall: 0.001, // $0.01 USD max per call
      // whitelistedServers: [
      //   '0x1234567890123456789012345678901234567890', // Test server
      // ],
    },
  });

  // Create the StreamableHttp transport to connect to local MCP server
  const transport = new StreamableHTTPClientTransport(new URL('http://localhost:3000/mcp'));

  // Connect the client to the transport
  await client.connect(transport);

  console.log('✅ Client connected to server');
  console.log('✅ Session ID:', transport.sessionId);

  try {
    // Test 1: Free calculator (no payment required)
    console.log('\n📋 Test 1: Free calculator (no payment required)');
    const freeResult = await client.callTool({
      name: 'free-calculator',
      arguments: { operation: 'add', a: 5, b: 3 }
    });
    console.log('✅ Free calculator result:', freeResult);

    // Test 2: Paid calculator (payment required)
    console.log('\n📋 Test 2: Paid calculator (payment required)');
    try {
      const paidResult = await client.callTool({
        name: 'add-numbers',
        arguments: { a: 10, b: 20 }
      });
      console.log('✅ Paid calculator result:', paidResult);
    } catch (error) {
      console.log('❌ Expected payment error:', error.message);
    }

    // Test 3: Multiply numbers (higher payment)
    console.log('\n📋 Test 3: Multiply numbers (higher payment)');
    try {
      const multiplyResult = await client.callTool({
        name: 'multiply-numbers',
        arguments: { a: 7, b: 8 }
      });
      console.log('✅ Multiply result:', multiplyResult);
    } catch (error) {
      console.log('❌ Expected payment error:', error.message);
    }

    // Test 4: List available tools
    console.log('\n📋 Test 4: List available tools');
    const toolsResult = await client.listTools({});
    console.log('✅ Available tools:', JSON.stringify(toolsResult, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close the connection
    await transport.close();
    console.log('✅ Client disconnected');
  }
}

// Run the test if this file is run directly
if (require.main === module) {
  testClientServerCommunication().catch(console.error);
}

export { testClientServerCommunication }; 