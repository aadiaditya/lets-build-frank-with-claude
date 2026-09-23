import { describe, expect, it } from "vitest";
import { runTool } from "../src/tools/define.js";
import { getStatus } from "../src/tools/get-status.js";

describe("get_status", () => {
  it("reports version, uptime and a greeting", async () => {
    const result = await runTool(getStatus, {});
    expect(result.isError).toBeFalsy();

    const output = result.structuredContent as Record<string, unknown>;
    expect(output).toMatchObject({ greeting: expect.any(String), version: expect.any(String) });
    expect(output.uptimeSeconds).toBeTypeOf("number");
    expect(output.summary).toContain("Frank is up");
  });

  it("puts the summary in the text content the model reads", async () => {
    const result = await runTool(getStatus, {});
    const [block] = result.content as Array<{ type: string; text: string }>;
    expect(block?.type).toBe("text");
    expect(block?.text).toBe((result.structuredContent as { summary: string }).summary);
  });

  it("rejects unknown arguments instead of ignoring them (ADR-002)", async () => {
    const result = await runTool(getStatus, { resourceGroup: "rg-somebody-elses" });
    expect(result.isError).toBe(true);
    const [block] = result.content as Array<{ text: string }>;
    expect(block?.text).toMatch(/invalid arguments/i);
  });
});
