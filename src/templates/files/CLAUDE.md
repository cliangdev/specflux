# CLAUDE.md

## SpecFlux Project

This project is managed by SpecFlux. The SpecFlux plugin provides commands for planning and implementation workflows.

## CRITICAL: Implementation Workflow

**When implementing tasks, you MUST follow this workflow exactly. No exceptions.**

### Before Starting ANY Task
1. **Verify API access** - Check `$SPECFLUX_API_URL` is set and accessible
2. **Fetch task details** - `GET /api/projects/{projectRef}/tasks/{taskRef}`
3. **Mark task IN_PROGRESS** - `PATCH {"status": "IN_PROGRESS"}`
4. **Read acceptance criteria** - `GET .../tasks/{taskRef}/acceptance-criteria`

**If API is unavailable, STOP and inform the user. Do NOT proceed.**

### During Implementation
5. Write tests for each acceptance criterion
6. Implement until ALL tests pass
7. Run full test suite

### After Completing Task
8. **Mark criteria met** - `PUT {"isMet": true}` for each criterion
9. **Commit** with task reference: `TASK-REF: description`
10. **Mark task COMPLETED** - `PATCH {"status": "COMPLETED"}`

### After All Tasks in Epic
11. **Mark epic COMPLETED** - `PATCH {"status": "COMPLETED"}`
12. **Create PR** with epic reference

### MUST NOT
- Start coding without marking task IN_PROGRESS via API
- Skip API status updates
- Leave task in IN_PROGRESS after completion
- Create PR without marking epic COMPLETED

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

## Workflow Summary

1. **Planning**: `/specflux:planning` to create PRD → break into epics → break into tasks
2. **Implementation**: `/specflux:implement` to work through tasks
3. **Each task**: Mark IN_PROGRESS → Tests first → implement → commit → Mark COMPLETED
4. **Each epic**: After all tasks done → Mark epic COMPLETED → Create PR

## API Reference

SpecFlux API at `$SPECFLUX_API_URL/api`:
- Projects: `/api/projects`
- PRDs: `/api/projects/{projectRef}/prds`
- Epics: `/api/projects/{projectRef}/epics`
- Tasks: `/api/projects/{projectRef}/tasks`

See `specflux-api` skill for complete endpoint documentation.
