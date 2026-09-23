# ADR-009: Frank reads what is running in his own resource group

**Status:** Proposed
**Date:** 2026-09

## Context

Frank can describe himself through `get_status`, but not his surroundings. The
closing demo asks *"what's running in your resource group?"* — a real read
against Azure, the moment a tool returns a fact no model holds in its weights.

ADR-006 recorded this as unimplementable: the managed identity did not exist
until the first deploy, and granting it `Reader` needed rights no student has.
ADR-010 removed that blocker — the deploy now passes the client id, secret,
tenant, subscription and resource group into the container, so Frank already
holds what he needs.

Two constraints shape the rest: ADR-002 forbids mutation, and the classroom
group is shared, so a tool taking a group as an argument would let any caller
point Frank at someone else's scope.

## Decision

- **One tool, `list_resources`.** Returns every resource in Frank's own
  resource group — name, type, location. It takes no arguments.
- **Scope comes from the environment at boot,** never from a parameter.
  `AZURE_SUBSCRIPTION_ID` and `AZURE_RESOURCE_GROUP` are read once at startup,
  and no tool accepts either as an argument, now or later.
- **Credential:** `DefaultAzureCredential` from `@azure/identity`, which picks
  up the client id, secret and tenant the deploy already sets. Listing uses
  `@azure/arm-resources`.
- **Fails closed.** With those unset — locally, or before the first deploy —
  the tool returns `isError: true` saying Frank is not configured to read
  Azure. It never guesses a scope.

## Consequences

- Frank reports on his own world — context arriving from outside the weights.
- The credential holds Contributor, far more than this needs; the read-only
  guarantee lives in the tool surface (ADR-002), not in IAM.
- `POST /mcp` is unauthenticated (ADR-007, Rejected), so anyone who finds the
  FQDN can read this. ADR-007 priced that against one seat's group; ADR-010
  made the group shared and names apps after GitHub accounts, so it now exposes
  the cohort's usernames. No data lives there — but the window is wider than
  ADR-007 costed, which is reason to revisit it.
- Rejected: a `resourceGroup` parameter, which makes Frank redirectable; a
  managed identity, removed by ADR-010; `@azure/arm-appcontainers`, which sees
  container apps only and would miss the registry and environment.
