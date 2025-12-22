# CLAUDE.md

## SpecFlux Project

This project is managed by SpecFlux. Use the SpecFlux API to create and track epics, tasks, and acceptance criteria.

## Available Commands

| Command | Description |
|---------|-------------|
| `/prd` | Create or refine product PRD (saved to `.specflux/prds/`) |
| `/epic` | Break down PRD into epics and tasks via API |
| `/implement` | Implement epic, working through tasks |
| `/task` | Work on a specific task |

## Required Skill

Use the `specflux-api` skill when working with epics, tasks, or acceptance criteria. It provides API endpoint documentation for:
- Creating/updating epics and tasks
- Managing acceptance criteria
- Tracking task dependencies
- Updating status and progress

## File Conventions

- PRD documents: `.specflux/prds/{name}/prd.md`
- Task state files: `.specflux/task-states/task-{id}-state.md`

## API Reference

SpecFlux API at `$SPECFLUX_API_URL/api` (set in your shell profile):
- Epics: `/api/projects/{projectRef}/epics`
- Tasks: `/api/projects/{projectRef}/tasks`
- Acceptance criteria: `.../epics/{epicRef}/acceptance-criteria` or `.../tasks/{taskRef}/acceptance-criteria`

## Workflow

1. **Create PRD**: `/prd` to define what you're building
2. **Define Epics**: `/epic <name>` creates epic + tasks via API
3. **Implement**: `/implement <epic>` or `/task <id>` for granular work
4. **Track Progress**: Update acceptance criteria and status via API
5. **Review**: Create PR when work is complete
