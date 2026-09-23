import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * Frank serves this console himself (ADR-006), so his MCP endpoint is on the
 * same origin. There is no VITE_FRANK_URL and no CORS anywhere — the ADR-003
 * cross-origin wiring was superseded precisely to remove them.
 */
export const MCP_PATH = "/mcp";

export interface FrankTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

/**
 * Frank runs stateless, so a connection is per-operation rather than held open.
 */
async function withFrank<T>(use: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ name: "frank-console", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_PATH, window.location.origin));
  await client.connect(transport);
  try {
    return await use(client);
  } finally {
    await client.close();
  }
}

export async function listTools(): Promise<FrankTool[]> {
  return withFrank(async (client) => {
    const { tools } = await client.listTools();
    return tools as FrankTool[];
  });
}

export interface ToolCallResult {
  isError: boolean;
  text: string;
  structured?: Record<string, unknown>;
}

export async function callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
  return withFrank(async (client) => {
    const result = await client.callTool({ name, arguments: args });
    const blocks = (result.content ?? []) as Array<{ type: string; text?: string }>;
    return {
      isError: Boolean(result.isError),
      text: blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n"),
      structured: result.structuredContent as Record<string, unknown> | undefined,
    };
  });
}
