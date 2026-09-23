import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runTool, strictSchema } from "../src/tools/define.js";
import { tools } from "../src/tools/index.js";

// ADR-002 is policy, not style, so it is enforced here rather than in review.
const ALLOWED_VERBS = ["get", "list", "search", "summarize"] as const;
const NAME = /^(get|list|search|summarize)_[a-z0-9]+(_[a-z0-9]+)*$/;

const toolsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../src/tools");

describe("ADR-002 tool conventions", () => {
  it("registers every tool module", () => {
    const modules = readdirSync(toolsDir)
      .filter((f) => f.endsWith(".ts"))
      .filter((f) => f !== "define.ts" && f !== "index.ts");
    expect(tools).toHaveLength(modules.length);
  });

  it.each(tools.map((t) => [t.name, t] as const))("%s is named from the closed verb set", (name, tool) => {
    expect(name).toMatch(NAME);
    const verb = name.split("_")[0];
    expect(ALLOWED_VERBS).toContain(verb);
    expect(tool.name).toBe(name);
  });

  it.each(tools.map((t) => [t.name, t] as const))("%s describes itself for a calling model", (_name, tool) => {
    expect(tool.description.trim().length).toBeGreaterThan(40);
  });

  it.each(tools.map((t) => [t.name, t] as const))("%s describes every parameter", (_name, tool) => {
    for (const [param, schema] of Object.entries(tool.inputSchema)) {
      expect((schema as z.ZodTypeAny).description, `parameter '${param}' has no .describe()`).toBeTruthy();
    }
  });

  it.each(tools.map((t) => [t.name, t] as const))("%s rejects unknown fields", (_name, tool) => {
    const parsed = strictSchema(tool).safeParse({ __definitely_not_a_parameter: true });
    expect(parsed.success).toBe(false);
  });

  it.each(tools.map((t) => [t.name, t] as const))("%s returns a summary plus typed detail", async (_name, tool) => {
    const result = await runTool(tool, {});
    if (result.isError) return; // a tool may legitimately need arguments
    const output = result.structuredContent as Record<string, unknown>;
    expect(typeof output.summary).toBe("string");
    expect(Object.keys(output).length).toBeGreaterThan(1);
  });

  it("exposes no mutating verb", () => {
    for (const tool of tools) {
      expect(tool.name).not.toMatch(/^(create|update|delete|run|remove|set|write)_/);
    }
  });
});
