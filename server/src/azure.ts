import { ResourceManagementClient } from "@azure/arm-resources";
import { DefaultAzureCredential } from "@azure/identity";
import { config } from "./config.js";

export interface AzureScope {
  subscriptionId: string;
  resourceGroup: string;
}

export interface AzureResource {
  name: string;
  type: string;
  location: string;
}

/**
 * Frank's scope, fixed at boot from the environment (ADR-009). There is
 * deliberately no way for a caller to supply one: the classroom resource group
 * is shared, so a redirectable Frank could be pointed at someone else's scope.
 */
export function azureScope(): AzureScope | null {
  const { subscriptionId, resourceGroup } = config.azure;
  if (!subscriptionId || !resourceGroup) return null;
  return { subscriptionId, resourceGroup };
}

export type ResourceLister = (scope: AzureScope) => Promise<AzureResource[]>;

/**
 * Reads with `DefaultAzureCredential`, which picks up the client id, secret and
 * tenant the deploy already sets (ADR-010). Listing only — ADR-002 forbids any
 * tool from mutating an external system.
 */
export const listResourcesInGroup: ResourceLister = async (scope) => {
  const client = new ResourceManagementClient(new DefaultAzureCredential(), scope.subscriptionId);
  const found: AzureResource[] = [];
  for await (const resource of client.resources.listByResourceGroup(scope.resourceGroup)) {
    found.push({
      name: resource.name ?? "(unnamed)",
      type: resource.type ?? "(unknown type)",
      location: resource.location ?? "(unknown location)",
    });
  }
  return found;
};
