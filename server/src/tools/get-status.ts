import { config, startedAt } from "../config.js";
import { defineTool } from "./define.js";

/**
 * Frank's first tool (ADR-002). It exists so the pipeline, the MCP client
 * wiring and the console can all be proven before any Azure integration does.
 */
export const getStatus = defineTool({
  name: "get_status",
  description:
    "Returns Frank's version, how long he has been running, and a greeting. " +
    "Call it to confirm Frank is reachable and healthy before using other tools. It takes no arguments and reads nothing outside this process.",
  inputSchema: {},
  run() {
    const uptimeSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    return {
      summary: `Frank is up. Version ${config.version}, running for ${uptimeSeconds}s.`,
      version: config.version,
      uptimeSeconds,
      startedAt: startedAt.toISOString(),
      greeting: "Hello, I'm Frank.",
    };
  },
});
