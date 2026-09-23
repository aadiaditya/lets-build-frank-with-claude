import { azureScope, listResourcesInGroup, type ResourceLister } from "../azure.js";
import { defineTool } from "./define.js";

/**
 * ADR-009. The lister is injectable so the tool can be tested without Azure;
 * production always gets the real one.
 */
export function createListResources(lister: ResourceLister = listResourcesInGroup) {
  return defineTool({
    name: "list_resources",
    description:
      "Lists every Azure resource in Frank's own resource group, with each one's name, type and location. " +
      "Use it to answer what is running alongside Frank. It takes no arguments — his scope is fixed when he starts and cannot be redirected by a caller.",
    inputSchema: {},
    async run() {
      const scope = azureScope();
      if (!scope) {
        // Fails closed (ADR-009): locally, and before the first deploy, Frank
        // has no Azure scope. Say so rather than guessing one.
        throw new Error(
          "Frank is not configured to read Azure. AZURE_SUBSCRIPTION_ID and AZURE_RESOURCE_GROUP are set by the deploy; they are absent here.",
        );
      }

      const resources = await lister(scope);
      return {
        summary:
          resources.length === 0
            ? `Frank's resource group ${scope.resourceGroup} is empty.`
            : `${resources.length} resource${resources.length === 1 ? "" : "s"} in ${scope.resourceGroup}.`,
        resourceGroup: scope.resourceGroup,
        count: resources.length,
        resources,
      };
    },
  });
}

export const listResources = createListResources();
