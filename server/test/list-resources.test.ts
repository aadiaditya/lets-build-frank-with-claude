import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AzureResource } from "../src/azure.js";

// config.ts reads the scope once at boot (ADR-009), so each case has to set the
// environment and then re-import the module graph.
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const [{ createListResources }, { runTool }] = await Promise.all([
    import("../src/tools/list-resources.js"),
    import("../src/tools/define.js"),
  ]);
  return { createListResources, runTool };
}

const SAMPLE: AzureResource[] = [
  { name: "frank-aadiaditya", type: "Microsoft.App/containerApps", location: "eastus" },
  { name: "frankclassacr", type: "Microsoft.ContainerRegistry/registries", location: "eastus" },
];

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

describe("list_resources", () => {
  it("fails closed when Frank has no Azure scope", async () => {
    const { createListResources, runTool } = await load({
      AZURE_SUBSCRIPTION_ID: undefined,
      AZURE_RESOURCE_GROUP: undefined,
    });
    const called = vi.fn();
    const result = await runTool(createListResources(async () => (called(), [])), {});

    expect(result.isError).toBe(true);
    expect(called).not.toHaveBeenCalled();
    const [block] = result.content as Array<{ text: string }>;
    expect(block?.text).toMatch(/not configured to read Azure/i);
    expect(block?.text).not.toMatch(/\bat .*\(.*:\d+:\d+\)/); // no stack trace (ADR-002)
  });

  it("lists what is in Frank's own group", async () => {
    const { createListResources, runTool } = await load({
      AZURE_SUBSCRIPTION_ID: "sub-1234",
      AZURE_RESOURCE_GROUP: "rg-frank-class",
    });
    const result = await runTool(createListResources(async () => SAMPLE), {});

    expect(result.isError).toBeFalsy();
    const output = result.structuredContent as Record<string, unknown>;
    expect(output.summary).toBe("2 resources in rg-frank-class.");
    expect(output.resourceGroup).toBe("rg-frank-class");
    expect(output.count).toBe(2);
    expect(output.resources).toEqual(SAMPLE);
  });

  it("reads the scope it was given, not one a caller supplies", async () => {
    const { createListResources, runTool } = await load({
      AZURE_SUBSCRIPTION_ID: "sub-1234",
      AZURE_RESOURCE_GROUP: "rg-frank-class",
    });
    const seen: string[] = [];
    const tool = createListResources(async (scope) => (seen.push(scope.resourceGroup), []));

    // The redirect attempt must be refused outright, and the scope untouched.
    const attack = await runTool(tool, { resourceGroup: "rg-somebody-else" });
    expect(attack.isError).toBe(true);
    expect(seen).toEqual([]);

    await runTool(tool, {});
    expect(seen).toEqual(["rg-frank-class"]);
  });

  it("says so plainly when the group is empty", async () => {
    const { createListResources, runTool } = await load({
      AZURE_SUBSCRIPTION_ID: "sub-1234",
      AZURE_RESOURCE_GROUP: "rg-frank-class",
    });
    const result = await runTool(createListResources(async () => []), {});
    expect((result.structuredContent as { summary: string }).summary).toMatch(/is empty/);
  });

  it("surfaces an Azure failure as a plain message, not a stack trace", async () => {
    const { createListResources, runTool } = await load({
      AZURE_SUBSCRIPTION_ID: "sub-1234",
      AZURE_RESOURCE_GROUP: "rg-frank-class",
    });
    const result = await runTool(
      createListResources(async () => {
        throw new Error("AuthorizationFailed: the client does not have authorization");
      }),
      {},
    );
    expect(result.isError).toBe(true);
    const [block] = result.content as Array<{ text: string }>;
    expect(block?.text).toContain("AuthorizationFailed");
    expect(block?.text).not.toMatch(/\bat .*\(.*:\d+:\d+\)/);
  });
});
