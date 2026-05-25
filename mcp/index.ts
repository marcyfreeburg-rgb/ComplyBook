// © 2026 ComplyBook, LLC. All rights reserved.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";

// This creates the MCP server
const server = new McpServer({
  name: "complybook",
  version: "1.0.0",
});

// === SUPER SIMPLE TEST TOOL ===
server.tool(
  "hello_grok",
  "Just a test tool to make sure everything works",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: "Hello from your ComplyBook app! MCP is working 🎉",
        },
      ],
    };
  },
);

// Set up a small Express server so Grok can connect to it
const app = express();
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
});

app.use("/mcp", async (req, res) => {
  await transport.handleRequest(req, res);
});

server.connect(transport);

// Start the server on port 3001 (different from your main app)
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ ComplyBook MCP is running on http://localhost:${PORT}/mcp`);
});
git add mcp/
git commit -m "Add MCP server"
