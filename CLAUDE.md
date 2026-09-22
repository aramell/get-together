# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **get-together**, a BMAD (Behavioral Methods for AI Design) v6.12.0 installation. BMAD is a prompt-engineering + workflow orchestration framework — there is no traditional source code, build system, or test runner for the framework itself. It is defined in Markdown, YAML, TOML, and CSV files executed by AI models.

The product code (Next.js app, `app/`, `components/`, `lib/`, `__tests__/`) lives alongside the framework and is described by BMAD artifacts in `_bmad-output/`.

## Upgrading BMAD

Re-run the installer from the project root. In a non-interactive shell, pass `--directory` and `--action update` explicitly (the installer otherwise stops at an interactive prompt):

```
npx bmad-method@latest install --directory "$PWD" --action update --yes --tools claude-code \
  --user-name Andrewramell --output-folder _bmad-output --no-shims --pin bmb=v2.2.2 \
  --set "tea.test_artifacts={project-root}/_bmad-output/test-artifacts" \
  --set "tea.test_design_output=_bmad-output/test-artifacts/test-design" \
  --set "tea.test_review_output=_bmad-output/test-artifacts/test-reviews" \
  --set "tea.trace_output=_bmad-output/test-artifacts/traceability" \
  --set "bmb.bmad_builder_output_folder={project-root}/_bmad-output/bmb-creations" \
  --set "bmb.bmad_builder_reports={project-root}/_bmad-output/bmb-creations/reports"
```

Installed modules: `core`, `bmm` (built-in, v6.12.0), `bmb` (external, pinned v2.2.2), `tea` (external, v1.27.x). The installer only manages `.claude/skills/` for Claude Code — stale `.claude/commands/`, `.cursor/commands/`, `.github/agents/`, `.github/prompts/` files from the pre-6.1 install are legacy and not managed.

## Architecture

BMAD v6.12 uses **native skills**: each capability is a directory under `.claude/skills/<name>/SKILL.md`, invoked as `/<name>` or auto-triggered from its description. The `_bmad/` directory holds config and manifests, not workflow definitions.

### Modules

| Module | Purpose |
|--------|---------|
| **Core** | Foundation skills: brainstorming, party-mode, help, review, advanced elicitation |
| **BMM** | Product lifecycle: agents (analyst, architect, dev, pm, ux-designer) + planning/build skills |
| **BMB** | BMAD Builder: `bmad-agent-builder`, `bmad-workflow-builder`, `bmad-module-builder` |
| **TEA** | Test Architect (Murat): `bmad-tea` + `bmad-testarch-*` skills |

### Key Paths

- `_bmad/config.toml` — Installer-managed config (**read-only**, regenerated on install)
- `_bmad/custom/config.toml` (team, committed) and `_bmad/custom/config.user.toml` (personal) — durable overrides; never touched by the installer. Use `/bmad-customize` to author them
- `_bmad/bmm/config.yaml` — Legacy-format module config (still generated)
- `_bmad/_config/` — Manifests (`skill-manifest.csv`, `bmad-help.csv`, `files-manifest.csv`, …)
- `_bmad/_memory/` — Agent persistent memory (tech-writer sidecar)
- `_bmad-output/` — All generated artifacts (planning, implementation)
- `docs/` — Project knowledge base (currently empty)
- `.claude/skills/` — BMAD skills plus non-BMAD skills (`supabase`, `supabase-postgres-best-practices`)

**Output locations:** BMB creations go to `_bmad-output/bmb-creations/` (reports in `.../reports`) and TEA output to `_bmad-output/test-artifacts/` (`test-design`, `test-reviews`, `traceability`). These differ from the module defaults (`skills/…`), so they must be re-passed as `--set` flags on upgrade or they revert. TEA skills read `_bmad/tea/config.yaml` directly, so a TOML override in `_bmad/custom/` would not affect them.

### Agents

| Skill | Persona | Specialization |
|-------|---------|----------------|
| `bmad-agent-analyst` | Mary | Market research, requirements elicitation |
| `bmad-agent-architect` | Winston | System architecture, technical design |
| `bmad-agent-dev` | Amelia | Story execution, implementation |
| `bmad-agent-pm` | John | PRD creation, requirements discovery |
| `bmad-agent-ux-designer` | Sally | UX design, interaction design |
| `bmad-tea` | Murat | Test architecture, quality gates |

The v6.0 agents `sm` (Bob), `qa` (Quinn), `tech-writer` (Paige), and `quick-flow-solo-dev` (Barry) no longer exist as agents; their work moved into skills (`bmad-sprint-planning`, `bmad-qa-generate-e2e-tests`, `bmad-build`).

## Session Variable Convention

Skills read their config from `_bmad/config.toml` (with `_bmad/custom/` overrides). Values for this project:
- `{user_name}` = Andrewramell
- `{communication_language}` = English
- `{output_folder}` = `{project-root}/_bmad-output`
- `{planning_artifacts}` = `{project-root}/_bmad-output/planning-artifacts`
- `{implementation_artifacts}` = `{project-root}/_bmad-output/implementation-artifacts`
- `{project_knowledge}` = `{project-root}/docs`

## Skills / Slash Commands

Type `/bmad-` to see the full list, or run `/bmad-help` for guidance on what to do next. Mapping from the old v6.0 commands:

| Task | Skill (v6.12) | Replaces |
|------|---------------|----------|
| Next-step guidance | `/bmad-help` | `/bmad-help` |
| Product brief / research | `/bmad-product-brief`, `/bmad-deep-recon` | `create-product-brief`, `*-research` |
| Create / edit / validate PRD | `/bmad-prd` | `create-prd`, `edit-prd`, `validate-prd` |
| Spec / stories from a spec | `/bmad-spec`, `/bmad-create-epics-and-stories` | `quick-spec`, epics workflow |
| Architecture | `/bmad-architecture` | `create-architecture` |
| UX design | `/bmad-ux` | `create-ux-design` |
| Sprint planning, status, readiness | `/bmad-sprint-planning` | `sprint-planning`, `sprint-status`, `check-implementation-readiness` |
| Implement a story / change | `/bmad-build` (or `/bmad-build-auto` for an unattended loop) | `create-story`, `dev-story`, `quick-dev` |
| Code review | `/bmad-code-review`, `/bmad-review` | `code-review` |
| Course correction / retro | `/bmad-correct-course`, `/bmad-retrospective` | same names |
| E2E tests | `/bmad-qa-generate-e2e-tests`, `/bmad-testarch-*` | `qa-generate-e2e-tests` |
| Repo agent instructions | `/bmad-project-context` | `generate-project-context` |
| Build agents / workflows / modules | `/bmad-agent-builder`, `/bmad-workflow-builder`, `/bmad-module-builder` | `bmad-bmb-*` |

There is no direct `document-project` equivalent; use `/bmad-project-context` for AI-facing repo docs.
