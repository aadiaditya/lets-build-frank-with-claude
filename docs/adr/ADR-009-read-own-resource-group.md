# ADR-009: Frank reads what is running in his own resource group

**Status:** Proposed
**Date:** 2026-09

## Context

Frank can describe himself through `get_status`, but not his surroundings. The
closing demo asks him *"what's running in your resource group?"* — a real read
against Azure, and the moment a tool returns a fact no model could hold in its
weights.

ADR-006 recorded this as unimplementable: the Container App's managed identity
did not exist until the first deploy, and granting it `Reader` needed rights no
student has. ADR-010 removed that blocker. The deploy now passes
`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`,
`AZURE_SUBSCRIPTION_ID` and `AZURE_RESOURCE_GROUP` into the container, so Frank
already holds what he needs.

Two constraints shape the rest. ADR-002 forbids mutation. And the classroom
resource group is shared, so a tool taking a resource group as an argument
would let any caller point Frank at someone else's scope.

## Decision

- **One tool, `list_resources`.** Returns every resource in Frank's own
  resource group — name, type, location. It takes no arguments.
- **Scope comes from the environment at boot,** never from a parameter.
  `AZURE_SUBSCRIPTION_ID` and `AZURE_RESOURCE_GROUP` are read once at startup.
  No tool accepts a subscription or resource group argument, now or later.
- **Credential:** `DefaultAzureCredential` from `@azure/identity`, which picks
  up the client id, secret and tenant the deploy already sets. Listing uses
  `@azure/arm-resources`.
- **Fails closed.** With those variables unset — locally, or before the first
  deploy — the tool returns `isError: true` saying Frank is not configured to
  read Azure. It never guesses a scope and never returns a stack trace.

## Consequences

- Frank reports on his own world, and the class watches context arrive from
  outside the weights.
- The credential holds Contributor, far more than this needs. The read-only
  guarantee lives in the tool surface (ADR-002), not in IAM — said plainly
  because it is the weak point.
- One shared group means Frank lists classmates' apps too. That is visible
  collaboration rather than a leak; the group holds nothing but container apps.
- Rejected: a `resourceGroup` parameter, which makes Frank redirectable by any
  caller; a managed identity, removed by ADR-010; `@azure/arm-appcontainers`,
  which sees container apps only and would miss the registry and environment.
