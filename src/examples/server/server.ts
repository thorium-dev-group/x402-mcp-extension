import express from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { X402MCPServer } from '../../server/x402MCPServer';
import { MockFacilitatorService } from '../../server/services/facilitators/mockFacilitator';
import { TestCalculator } from './TestCalculator';
import { Network } from 'x402/types';

async function startServer() {
  //forces compiler to recognize decorators at runtime
  new TestCalculator();

  const app = express();
  const port = process.env.PORT || 3000;
  app.use(express.json({ limit: '4mb' }));

  // Session map: sessionId -> { mcpServer, transport }
  const sessions: Record<string, { mcpServer: X402MCPServer, transport: StreamableHTTPServerTransport }> = {};

  // Helper to create a new session
  async function createSession() {
    const sessionId = randomUUID();
    // Create server configuration
    const serverConfig = {
      name: 'test-x402-server',
      version: '1.0.0',
      x402Config: {
        payTo: '0x1234567890123456789012345678901234567890',
        network: 'base-sepolia' as Network,
        facilitator: new MockFacilitatorService(true, true),
        baseMCPServerDomain: `http://example.com`,
      },
    };
    // Create the X402MCPServer
    const mcpServer = new X402MCPServer(serverConfig);
    
    // Register handler classes (new way!)
    mcpServer.registerHandlers(TestCalculator);
    
    // Create the transport with sessionIdGenerator returning the sessionId
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
    });
    // Clean up session on close
    transport.onclose = () => {
      console.log('🔧 Session closed', sessionId);
      delete sessions[sessionId];
    };
    // Connect the server to the transport
    await mcpServer.connect(transport);
    // Store in session map
    sessions[sessionId] = { mcpServer, transport };
    return { sessionId, mcpServer, transport };
  }

  // POST /mcp: client-to-server communication
  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let session = sessionId ? sessions[sessionId] : undefined;
    if (session) {
      // Existing session
      await session.transport.handleRequest(req, res, req.body);
      return;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session initialization
      const { sessionId: newSessionId, transport } = await createSession();
      // Set header for client
      res.setHeader('mcp-session-id', newSessionId);
      console.log('🔧 New session initialized', newSessionId);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: req.body?.id || null,
      });
      return;
    }
  });

  // GET /mcp: server-to-client notifications via SSE
  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const session = sessionId ? sessions[sessionId] : undefined;
    if (!session) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    res.on('close', () => {
      console.log('🔧 Session closed on original response', sessionId);
      if (sessionId) {
        delete sessions[sessionId];
      }
    });
    await session.transport.handleRequest(req, res);
  });

  // DELETE /mcp: session termination
  app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const session = sessionId ? sessions[sessionId] : undefined;
    if (!session) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await session.transport.handleRequest(req, res);
  });

  app.listen(port, () => {
    console.log(`🚀 X402-MCP Server running on port ${port}`);
    console.log(`📡 POST /mcp - Client to server communication`);
    console.log(`📡 GET /mcp - Server to client notifications (SSE)`);
    console.log(`📡 DELETE /mcp - Session termination`);
  });
}

startServer().catch(console.error); 