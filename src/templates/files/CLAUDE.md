# CLAUDE.md

## SpecFlux Project

This project is managed by SpecFlux. The SpecFlux plugin provides commands for planning and implementation workflows.

## Available Commands

| Command | Description |
|---------|-------------|
| `/specflux:planning` | Create PRDs, break into epics and tasks - unified planning workflow |
| `/specflux:planning draft` | Start drafting a new PRD |
| `/specflux:planning refine` | Refine the current PRD |
| `/specflux:planning breakdown` | Break PRD into epics and tasks |
| `/specflux:planning status` | Show planning progress |
| `/specflux:implement` | Start implementation on an epic or task |
| `/specflux:implement {ref}` | Implement specific epic/task (e.g., SPEC-E1, SPEC-42) |

## Plugin Skills

The SpecFlux plugin provides these skills (always active):

| Skill | Purpose |
|-------|---------|
| `specflux-coding` | Implementation workflow: tests first, one commit per task |
| `specflux-api` | SpecFlux API interactions |
| `prd-template` | PRD structure and patterns |
| `epic-template` | Epic/task breakdown patterns |

## File Conventions

- PRD documents: `.specflux/prds/{name}/prd.md`
- Supporting docs: `.specflux/prds/{name}/architecture.md`, `user-flows.md`, etc.

## Workflow

1. **Planning**: `/specflux:planning` to create PRD → break into epics → break into tasks
2. **Implementation**: `/specflux:implement` to work through tasks
3. **Each task**: Tests first → implement → one commit when all pass
4. **PR**: Create PR when epic complete

## API Reference

SpecFlux API at `$SPECFLUX_API_URL/api`:
- Projects: `/api/projects`
- PRDs: `/api/projects/{projectRef}/prds`
- Epics: `/api/projects/{projectRef}/epics`
- Tasks: `/api/projects/{projectRef}/tasks`

See `specflux-api` skill for complete endpoint documentation.
