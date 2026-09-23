import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "./config.js";
import { runTool, strictSchema } from "./tools/define.js";
import { tools } from "./tools/index.js";

/**
 * A fresh server per request. Frank runs stateless (see app.ts), so nothing is
 * carried between calls and one deployed Frank serves many clients at once.
 */
export function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "frank", version: config.version });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        // A bare shape is NOT enough: the SDK builds a permissive object from
        // it and silently strips unknown keys before the handler ever runs, so
        // ADR-002's "unknown fields rejected" would quietly not hold. Register
        // the strict schema so the rejection happens at the protocol boundary.
        inputSchema: strictSchema(tool),
      },
      (args: unknown) => runTool(tool, args),
    );
  }

  return server;
}
