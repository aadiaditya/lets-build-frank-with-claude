import { existsSync } from "node:fs";
import { join } from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type Express } from "express";
import { config } from "./config.js";
import { buildMcpServer } from "./mcp.js";

const CONSOLE_INDEX = join(config.consoleDir, "index.html");

function methodNotAllowed(_req: express.Request, res: express.Response): void {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Frank runs stateless — use POST /mcp." },
    id: null,
  });
}

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: "4mb" }));

  // Health probe (ADR-001). Kept trivial on purpose: it answers whether the
  // process is serving, not whether anything downstream is well.
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok", version: config.version });
  });

  // MCP over Streamable HTTP. A new server and transport per request, with no
  // session id, is the stateless pattern — it lets one Frank serve a classroom
  // of clients concurrently without holding per-client state.
  app.post("/mcp", async (req, res) => {
    const server = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Frank could not handle that request." },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  // The console is built late in the class (ADR-003) and is served by Frank
  // himself from the same container (ADR-006), so it calls /mcp relatively and
  // there is no CORS anywhere. Until it exists, say so rather than 404.
  if (existsSync(CONSOLE_INDEX)) {
    app.use(express.static(config.consoleDir));
  } else {
    app.get("/", (_req, res) => {
      res
        .status(200)
        .type("text/plain")
        .send(
          "Frank is running, but the console has not been built yet (ADR-003).\n" +
            "MCP is at POST /mcp and health at GET /healthz.\n",
        );
    });
  }

  return app;
}
