import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Every tool's output is a top-level `summary` a human or model can read, plus
 * typed detail fields (ADR-002).
 */
export interface ToolOutput {
  summary: string;
  [field: string]: unknown;
}

export interface FrankTool<Args extends z.ZodRawShape = z.ZodRawShape> {
  /** `verb_noun`, lower snake_case, verb from get/list/search/summarize. */
  name: string;
  /** For a model deciding whether to call it: what it returns, when, its limits. */
  description: string;
  /** Per-parameter zod schemas. Every parameter carries a `.describe()`. */
  inputSchema: Args;
  run(args: z.infer<z.ZodObject<Args>>): Promise<ToolOutput> | ToolOutput;
}

export function defineTool<Args extends z.ZodRawShape>(tool: FrankTool<Args>): FrankTool<Args> {
  return tool;
}

/**
 * ADR-002 requires unknown fields to be rejected, which a bare shape does not do
 * — zod strips them by default. Validate strictly here before the handler runs.
 */
export function strictSchema<Args extends z.ZodRawShape>(tool: FrankTool<Args>) {
  return z.object(tool.inputSchema).strict();
}

/**
 * Runs a tool and shapes the MCP result. Errors come back as `isError: true`
 * with a plain-language message — never a stack trace (ADR-002).
 */
export async function runTool<Args extends z.ZodRawShape>(
  tool: FrankTool<Args>,
  rawArgs: unknown,
): Promise<CallToolResult> {
  const parsed = strictSchema(tool).safeParse(rawArgs ?? {});
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `${tool.name} was called with invalid arguments — ${problems}.` }],
      isError: true,
    };
  }

  try {
    const output = await tool.run(parsed.data as z.infer<z.ZodObject<Args>>);
    return {
      content: [{ type: "text", text: output.summary }],
      structuredContent: output,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "an unexpected problem occurred";
    return {
      content: [{ type: "text", text: `${tool.name} could not complete: ${reason}` }],
      isError: true,
    };
  }
}
