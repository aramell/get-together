# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **get-together**, a BMAD (Behavioral Methods for AI Design) v6.0.4 installation. BMAD is a prompt-engineering + workflow orchestration framework — there is no traditional source code, build system, or test runner. Everything is defined in Markdown, YAML, and XML files executed by AI models.

## No Build/Test/Lint Commands

This project has no `package.json`, `Makefile`, or compiler. Validation is done through BMAD's own workflow commands:
- **PRD validation**: `/bmad-validate-prd`
- **Agent/workflow/module validation**: `/bmad-bmb-validate-agent`, `/bmad-bmb-validate-workflow`, `/bmad-bmb-validate-module`
- **Code review**: `/bmad-code-review`

## Architecture

The framework lives entirely under `_bmad/` and uses slash commands (`.claude/commands/`, `.github/prompts/`) as entrypoints.

### Three Modules

| Module | Path | Purpose |
|--------|------|---------|
| **Core** | `_bmad/core/` | Foundation: `workflow.xml` engine, brainstorming, party-mode, editorial tasks |
| **BMM** | `_bmad/bmm/` | Business Methodology Module: 11 agents + phase-organized workflows for full product lifecycle |
| **BMB** | `_bmad/bmb/` | BMAD Builder: agents and workflows for creating/editing other agents, modules, and workflows |

### Key Paths

- `_bmad/_config/` — Manifests and registries (agent, workflow, file, help, task, tool)
- `_bmad/bmm/config.yaml` — Primary runtime config (always load before any agent/workflow)
- `_bmad/core/tasks/workflow.xml` — YAML workflow engine (required for all YAML-based workflows)
- `_bmad/_memory/` — Agent persistent memory and tech-writer standards
- `_bmad-output/` — All generated artifacts (planning, implementation, bmb-creations)
- `docs/` — Project knowledge base (currently empty)
- `.claude/commands/` — 58 Claude Code slash command definitions
- `.github/agents/` — 13 agent definition files (for GitHub Copilot)
- `.github/prompts/` — 65+ prompt definitions

### Workflow Execution Patterns

Two execution modes:
1. **Markdown-based**: Load and follow the `.md` file directly
2. **YAML-based**: Load `_bmad/core/tasks/workflow.xml` first, then pass the `.yaml` config; steps execute JIT (one at a time), save after every `template-output` tag

### BMM Agents (11 Specialized Personas)

| Slug | Persona | Specialization |
|------|---------|---------------|
| `analyst` | Mary | Market research, requirements elicitation |
| `architect` | Winston | Distributed systems, cloud, API design |
| `dev` | Amelia | Story execution, TDD, implementation |
| `pm` | John | PRD creation, requirements discovery |
| `qa` | Quinn | Test automation, E2E testing |
| `quick-flow-solo-dev` | Barry | Rapid spec + lean implementation |
| `sm` | Bob | Sprint planning, backlog management |
| `tech-writer` | Paige | Documentation, Mermaid diagrams |
| `ux-designer` | Sally | User research, interaction design |

### BMM Workflow Phases

Workflows under `_bmad/bmm/workflows/` are organized by phase:
- `1-analysis/` — Product brief, domain/market/technical research
- `2-plan-workflows/` — PRD creation/editing/validation, UX design
- `3-solutioning/` — Architecture, implementation readiness, epics & stories
- `4-implementation/` — Code review, story creation, dev, sprint planning, retrospectives
- `quick-flow/` — Fast spec + implementation for small features
- `qa/` — E2E test generation
- `document-project/` — Brownfield project documentation

## Session Variable Convention

When activating any agent or running any workflow, load `_bmad/bmm/config.yaml` first and store these as session variables:
- `{user_name}` = Andrewramell
- `{communication_language}` = English
- `{output_folder}` = `{project-root}/_bmad-output`
- `{planning_artifacts}` = `{project-root}/_bmad-output/planning-artifacts`
- `{implementation_artifacts}` = `{project-root}/_bmad-output/implementation-artifacts`
- `{project_knowledge}` = `{project-root}/docs`

## Slash Commands

All BMAD functionality is accessible via `/bmad-` prefixed commands. Type `/bmad-` to see the full list. Key commands:
- `/bmad-help` — Get guidance on what to do next
- `/bmad-create-prd`, `/bmad-edit-prd`, `/bmad-validate-prd`
- `/bmad-create-architecture`, `/bmad-create-epics-and-stories`
- `/bmad-create-story`, `/bmad-dev-story`
- `/bmad-sprint-planning`, `/bmad-sprint-status`
- `/bmad-quick-spec`, `/bmad-quick-dev`
- `/bmad-document-project`
