import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The package root is one level up from this module, whether it is running as
// `src/config.ts` in dev or `dist/config.js` in the image. The Dockerfile puts
// the built console at `<package root>/public`, so that is where we look.
const moduleDir = dirname(fileURLToPath(import.meta.url));
export const packageRoot = resolve(moduleDir, "..");

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// All settings arrive as environment variables (ADR-001). No config file holds
// a value. Frank's Azure scope in particular is read here, at boot, and never
// from a tool parameter — a caller must not be able to redirect him.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  version: readVersion(),
  consoleDir: resolve(packageRoot, "public"),
  azure: {
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID ?? null,
    resourceGroup: process.env.AZURE_RESOURCE_GROUP ?? null,
  },
} as const;

export const startedAt = new Date();
