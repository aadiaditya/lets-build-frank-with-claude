import { describe, expect, it } from "vitest";
import { coerceArgs, fieldsFromSchema } from "../src/schema";

// The tool surface Frank actually publishes for get_status.
const NO_ARGS = { type: "object", properties: {} };

const WITH_ARGS = {
  type: "object",
  properties: {
    resourceGroup: { type: "string", description: "The resource group to read." },
    limit: { type: "integer", description: "How many rows to return." },
    includeStopped: { type: "boolean", description: "Include stopped apps." },
    shape: { type: "array", description: "Not renderable as a simple field." },
  },
  required: ["resourceGroup"],
};

describe("fieldsFromSchema", () => {
  it("returns nothing for a tool that takes no arguments", () => {
    expect(fieldsFromSchema(NO_ARGS)).toEqual([]);
  });

  it("survives a missing or malformed schema", () => {
    expect(fieldsFromSchema(undefined)).toEqual([]);
    expect(fieldsFromSchema(null)).toEqual([]);
    expect(fieldsFromSchema({})).toEqual([]);
  });

  it("maps JSON Schema types onto form field kinds", () => {
    const byName = Object.fromEntries(fieldsFromSchema(WITH_ARGS).map((f) => [f.name, f]));
    expect(byName.resourceGroup?.kind).toBe("string");
    expect(byName.limit?.kind).toBe("number");
    expect(byName.includeStopped?.kind).toBe("boolean");
    expect(byName.shape?.kind).toBe("unsupported");
  });

  it("carries the description and required flag through to the form", () => {
    const [first] = fieldsFromSchema(WITH_ARGS);
    expect(first?.description).toBe("The resource group to read.");
    expect(first?.required).toBe(true);
    expect(fieldsFromSchema(WITH_ARGS).find((f) => f.name === "limit")?.required).toBe(false);
  });
});

describe("coerceArgs", () => {
  const fields = fieldsFromSchema(WITH_ARGS);

  it("omits untouched optional fields so Frank's strict schema accepts the call", () => {
    expect(coerceArgs(fields, { resourceGroup: "rg-frank-class" })).toEqual({ resourceGroup: "rg-frank-class" });
  });

  it("converts numeric input out of the text field", () => {
    const args = coerceArgs(fields, { resourceGroup: "rg", limit: "25" });
    expect(args.limit).toBe(25);
  });

  it("sends a checked box and omits an unchecked one", () => {
    expect(coerceArgs(fields, { includeStopped: true }).includeStopped).toBe(true);
    expect(coerceArgs(fields, { includeStopped: false })).not.toHaveProperty("includeStopped");
  });
});
