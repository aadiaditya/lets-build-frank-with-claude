import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";

let http: Server;
let base: string;

beforeAll(async () => {
  http = createApp().listen(0);
  await new Promise<void>((done) => http.once("listening", () => done()));
  base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((done) => http.close(() => done()));
});

async function connect(): Promise<Client> {
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
  return client;
}

describe("Frank over Streamable HTTP", () => {
  it("answers the health probe", async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: "ok" });
  });

  // The console is built late in the class, so `/` has to behave in both
  // states: serve it when present, explain itself when not — never 404.
  it("serves / whether or not the console has been built", async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    const body = await res.text();

    if (existsSync(join(config.consoleDir, "index.html"))) {
      expect(body).toMatch(/<div id="root">/);
    } else {
      expect(body).toMatch(/console has not been built yet/i);
    }
  });

  it("discovers get_status through MCP", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("get_status");
    await client.close();
  });

  it("calls get_status and returns structured output", async () => {
    const client = await connect();
    const result = await client.callTool({ name: "get_status", arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({ greeting: expect.any(String) });
    await client.close();
  });

  // Regression: registering a bare zod shape let the SDK strip unknown keys
  // before the handler ran, so ADR-002's "unknown fields rejected" held in a
  // unit test but not over the wire. Assert it where a caller actually sits.
  it("rejects unknown arguments over the wire, not just in the helper", async () => {
    const client = await connect();
    let rejected = false;
    let message = "";
    try {
      const result = await client.callTool({ name: "get_status", arguments: { resourceGroup: "rg-elsewhere" } });
      rejected = Boolean(result.isError);
      message = JSON.stringify(result.content);
    } catch (error) {
      rejected = true;
      message = error instanceof Error ? error.message : String(error);
    }
    expect(rejected, "get_status accepted an argument it does not declare").toBe(true);
    expect(message).toMatch(/resourceGroup/);
    await client.close();
  });

  it("publishes additionalProperties:false so clients can see the schema is closed", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const status = tools.find((t) => t.name === "get_status");
    expect(status?.inputSchema).toMatchObject({ additionalProperties: false });
    await client.close();
  });

  it("refuses GET on the MCP endpoint", async () => {
    const res = await fetch(`${base}/mcp`);
    expect(res.status).toBe(405);
  });
});
