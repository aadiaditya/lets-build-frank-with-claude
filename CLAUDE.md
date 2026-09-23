# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A classroom repo for a one-day course. **Frank** is an MCP server with a
Cloudscape web console, deployed to Azure Container Apps by GitHub Actions.

`server/` and `ui/` are **empty on purpose** — they contain only `.gitkeep`.
The architecture lives entirely in `docs/adr/`, and the code is built from those
ADRs during the class. When asked to build something here, read the relevant ADR
first; it is the specification, not background reading.

## Read the ADRs as a chain, not individually

Several ADRs are partially superseded. Reading one in isolation gives you
**wrong answers**. `docs/adr/README.md` holds the authoritative status table.

- **ADR-006** partially supersedes **003, 004, 005** — drops Static Web Apps,
  merges console + server into one container.
- **ADR-010** supersedes **ADR-006's credential model** — the pipeline fetches a
  shared classroom credential; the student sets up nothing.
- **ADR-007 is Rejected.** Do not implement it. Frank's `/mcp` endpoint has no
  caller authentication.

Consequences that only emerge from reading the chain:

| Don't assume | Because |
|---|---|
| Static Web Apps hosts the UI | ADR-006 dropped it — one container serves both |
| `VITE_FRANK_URL` / CORS config exists | ADR-006 removed both; the console calls `/mcp` **relatively** |
| Frank uses a managed identity | ADR-004 specified one, but **ADR-010 removed it** — Frank uses the same client credential that deployed him, via `DefaultAzureCredential` |
| OIDC federation is used | ADR-005 specified it; ADR-006 replaced it with a client secret and explains why federation is unworkable for an open-enrolment class |
| Per-student resource groups / seat cards / setup scripts | ADR-010 removed all of it; one shared `rg-frank-class` |

The root `README.md` table lists ADR-006 and ADR-010 as *Proposed*; both are
**Accepted**. Trust `docs/adr/README.md`.

## Architecture

One container, three surfaces:

```
GET  /         → the Cloudscape console (static files from ui/dist)
POST /mcp      → MCP over Streamable HTTP
GET  /healthz  → 200 for health probes
```

- **Frank** (`server/`) — TypeScript on Node 22+, Express, the official
  `@modelcontextprotocol/sdk`, Streamable HTTP transport. No hand-rolled
  protocol code. All config via environment variables; no config files holding
  values. (ADR-001)
- **Console** (`ui/`) — React 18 + TypeScript + Vite, using
  `@cloudscape-design/components` only. No second component library, no custom
  CSS beyond layout glue. Two pages: *Overview* (`get_status` output) and
  *Tools* (MCP discovery, with forms rendered from each tool's input schema).
  Holds no secrets. (ADR-003)
- **The console is optional at build time.** Frank must deploy and serve MCP
  before the console exists. The Dockerfile's `ui-build` stage tolerates an
  empty `ui/`, and `app.ts` must handle an absent console at `/` by saying so.

`server/` and `ui/` are self-contained npm packages, each with `npm run dev`,
`npm test`, and `npm run build`.

## Tool conventions (ADR-002) — policy, not style

- **`verb_noun`, lower snake_case.** The verb comes from a **closed set**:
  `get`, `list`, `search`, `summarize`.
- **`create_*`, `update_*`, `delete_*`, `run_*` are out of policy.** If one is
  genuinely needed, stop and say so — it requires a new ADR superseding ADR-002.
- **Read-only rule.** No tool may mutate any external system — not Azure, not
  GitHub, not the filesystem beyond temp space.
- Inputs validated with `zod`, unknown fields rejected, every parameter described.
- Output is structured JSON: a top-level `summary` string plus typed detail fields.
- Errors return `isError: true` with a plain-language message, never a stack trace.
- Descriptions are written for *a model deciding whether to call the tool*.
- One module per tool under `server/src/tools/`, registered in
  `server/src/tools/index.ts`, with a test under `server/test/`.
- First tool is `get_status` (version, uptime, greeting) so the pipeline and UI
  can be proven before any Azure integration exists.

## The ADR process (ADR-000)

- Use `/adr <title>` to scaffold. It takes the next number, writes **Status:
  Proposed**, and hands the draft to the `adr-reviewer` agent.
- **An Accepted ADR is immutable.** To change course, write a new ADR that
  supersedes it — wholly, or naming the exact clauses it replaces. Only the
  Status line of a superseded ADR may be edited, to record the supersession.
- A declined decision is recorded as **Rejected**, not deleted.
- One page maximum. Existing ADRs run 290–375 words; match them. Specific is not
  the same as long — SDK property names and function signatures belong in code.
- Consequences must name real costs and rejected alternatives.
- Workflow is **Claude drafts → Copilot attacks → a human decides.** Leave new
  ADRs uncommitted; accepting a decision is a human's call.
- Update the tables in **both** `docs/adr/README.md` and `README.md`.

## Subagents in `.claude/agents/`

Model choice is deliberate and is itself a teaching point — pick the model for
the shape of the work:

- `adr-reviewer` (**opus**) — judgment work: is this implementable, does it
  contradict another ADR or the workflow file.
- `tool-conventions` (**haiku**) — mechanical audit of `server/src/tools/`
  against ADR-002.
- `secret-scanner` (**haiku**) — pattern matching for credentials across the
  tree, including `CLAUDE.md`, `.claude/**`, and `docs/adr/**`.

## Build and deploy

```bash
# once server/ or ui/ exist
cd server && npm ci && npm test && npm run build
cd ui     && npm ci && npm test && npm run build

# the image — build context is the REPOSITORY ROOT, not server/,
# because the build needs ui/ too
docker build -f Dockerfile -t frank .
docker run -p 3000:3000 frank
```

No test runner is chosen yet — ADR-001 only fixes the `npm test` entry point.
Once `server/` is scaffolded, record the single-test invocation here.

Pipeline (`.github/workflows/deploy.yml`):

- **Pull requests** → build and test `server/` and `ui/`. No Azure. Both jobs
  no-op with a notice until the matching `package-lock.json` is committed.
- **Push to `main`** → deploy. The PR build jobs are **skipped on main by
  design**; the Dockerfile runs `npm test` in both build stages, so the image
  build *is* the test gate. A red suite fails the build and nothing deploys.
- The workflow fetches the classroom credential from `CREDENTIAL_URL` itself.
  Setting `AZURE_CREDENTIALS` on the fork overrides it (instructor escape hatch).
- Deployment is `az acr build` then `az containerapp create`/`update`.
  **Do not switch to `az containerapp up --source .`** — it crashes on some
  azure-cli builds (`'NoneType' object has no attribute 'linux'`), and
  installing the containerapp extension does not help.
- The container app name derives from `github.repository_owner`, so your GitHub
  account is your isolation.

Gotchas that cost the most time:

- **Actions are disabled on forks by default.** Enable them on the Actions tab
  or a push to `main` silently does nothing — no build, no failure, no log.
- `--target-port 3000` in the workflow, `ENV PORT=3000` in the Dockerfile, and
  `config.ts`'s `PORT` default must stay in agreement.
- After `claude mcp add --transport http frank https://<fqdn>/mcp`, **restart
  `claude`** — MCP servers load at session start, so a running session won't see him.
- Frank's resource group scope is read from the environment at boot, never from
  a tool parameter, so a caller cannot redirect him.

## Security ground rules

- Branch protection on `main` is **not inherited from upstream** on a fork, and
  pushing to `main` deploys. Turn it on yourself.
- Never commit credentials, paste them into prompts, or put them in `CLAUDE.md`
  or an ADR. The committed `CREDENTIAL_URL` is the deliberate exception and
  ADR-010 explains exactly what that costs.
- Claude Code permission prompts stay **on** for destructive actions.
