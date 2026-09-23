import type { z } from "zod";
import type { FrankTool } from "./define.js";
import { getStatus } from "./get-status.js";
import { listResources } from "./list-resources.js";

export type AnyFrankTool = FrankTool<z.ZodRawShape>;

/**
 * Every tool Frank exposes. A tool that is not registered here does not exist
 * as far as an MCP client is concerned.
 */
export const tools: AnyFrankTool[] = [getStatus, listResources];

export { getStatus, listResources };
