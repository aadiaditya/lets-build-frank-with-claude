/**
 * Turns a tool's JSON Schema into form fields.
 *
 * This is the payoff of ADR-002's schema discipline: a new tool appears in the
 * console with no UI work, because the form is derived rather than written.
 */
export type FieldKind = "string" | "number" | "boolean" | "unsupported";

export interface Field {
  name: string;
  kind: FieldKind;
  description?: string;
  required: boolean;
}

interface JsonSchemaLike {
  properties?: Record<string, { type?: string; description?: string }>;
  required?: string[];
}

function kindOf(type: string | undefined): FieldKind {
  switch (type) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "unsupported";
  }
}

export function fieldsFromSchema(schema: unknown): Field[] {
  if (!schema || typeof schema !== "object") return [];
  const { properties, required } = schema as JsonSchemaLike;
  if (!properties) return [];
  const requiredNames = new Set(required ?? []);

  return Object.entries(properties).map(([name, spec]) => ({
    name,
    kind: kindOf(spec?.type),
    description: spec?.description,
    required: requiredNames.has(name),
  }));
}

/** Drops untouched optional fields so Frank's strict schemas don't reject them. */
export function coerceArgs(fields: Field[], values: Record<string, string | boolean>): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.kind === "boolean") {
      if (value === true) args[field.name] = true;
      continue;
    }
    if (typeof value !== "string" || value.trim() === "") continue;
    args[field.name] = field.kind === "number" ? Number(value) : value;
  }
  return args;
}
