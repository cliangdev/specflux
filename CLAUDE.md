# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpecFlux is a desktop application (Tauri + React) that orchestrates Claude Code AI agents across multiple software repositories. It transforms "vibe coding" into disciplined, spec-driven engineering by providing a unified Kanban board for multi-repo project management, automatic Claude Code agent launching with context injection, and human-in-the-loop approval workflows.

**Current Status:** ~35-40% of MVP complete. Phase 1-2 foundation done, Phase 3+ remaining.

### Completed
- **Backend:** Node.js + Express + SQLite with 13 tables, 44/49 MVP endpoints
- **Frontend:** React + TailwindCSS + Tauri with layout, navigation, task list, task creation
- **Claude Code Integration:** Process spawning, worktree management, terminal embedding (xterm.js + WebSocket)
- **Dev Tools:** Skills, agents, commands, CLAUDE.md files configured

### In Progress
- Terminal output parsing, file change tracking, worktree lifecycle management

### Remaining
- Kanban board with drag-drop (Week 5-6)
- Approval system and dependency visualization (Week 6)
- Chain output generation and context injection (Week 7-8)
- Workflow templates and agent management UI (Week 9-10)
- Git sync, notifications, polish, onboarding (Week 11-12)

**Key Milestone:** Self-hosting target at end of Week 6 (use SpecFlux to build SpecFlux)

## Tech Stack

- **Backend:** Node.js 20+, TypeScript (strict), Express/Fastify, SQLite (better-sqlite3)
- **Frontend:** React 18+, TypeScript, TailwindCSS, Tauri (Rust)
- **Testing:** Jest
- **API Design:** OpenAPI/Swagger with auto-generated TypeScript client

## Project Structure

```
specflux/                    <- Run Claude Code from here
├── .claude/                 # Claude Code configuration
│   ├── .mcp.json            # MCP servers (GitHub, Filesystem)
│   ├── skills/              # Coding pattern guides
│   │   ├── typescript-patterns/
│   │   ├── tauri-dev/
│   │   ├── api-design/
│   │   └── database-migrations/
│   ├── agents/              # Specialized agent definitions
│   │   ├── backend-dev.md
│   │   ├── frontend-dev.md
│   │   └── fullstack-dev.md
│   └── commands/            # Custom slash commands
│       ├── test-all.md
│       ├── build-prod.md
│       ├── db-migrate.md
│       └── api-spec-update.md
├── orchestrator/            # Backend service
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── db/              # Database layer
│   │   └── types/           # TypeScript types
│   ├── tests/
│   ├── migrations/
│   └── openapi/             # API specifications (DDD-organized)
│       ├── index.yaml       # Main entry point, references domain specs
│       ├── projects.yaml    # Project domain endpoints
│       ├── epics.yaml       # Epic domain endpoints
│       ├── tasks.yaml       # Task domain endpoints
│       ├── repositories.yaml
│       ├── notifications.yaml
│       └── components/      # Shared schemas and responses
├── frontend/                # Tauri desktop app
│   ├── src/
│   │   ├── components/
│   │   ├── api/             # Generated API client
│   │   └── hooks/
│   └── src-tauri/           # Rust/Tauri code
└── docs/research/           # Product specs and roadmap
```

## Build Commands

```bash
# Backend
cd orchestrator
npm install
npm run dev          # Start with nodemon
npm test             # Run Jest tests
npm run lint         # ESLint
npm run migrate      # Database migrations

# Frontend
cd frontend
npm install
npm run tauri dev    # Full app development
npm run tauri build  # Production build

# Root level
npm run test:all     # All tests
npm run build:all    # Full build
npm run generate:client  # Regenerate TS client from OpenAPI
```

## Git Workflow

**IMPORTANT: Never push directly to main. Always use feature branches and PRs.**

**CRITICAL: Each task/feature MUST start on a new branch from main.** Do not add unrelated changes to existing feature branches. One branch = one logical unit of work = one PR.

### Starting a New Task
```bash
git checkout main
git pull
git checkout -b feature/your-task-name
# make changes, commit, push, create PR
```

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation changes

### Commit Messages
Use conventional commits format:
```
type: short description

- Detailed bullet points
- Explaining the changes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### Pull Request Process
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit with conventional format
3. **Update `docs/research/specflux-development-roadmap.md`** - Mark completed items with `[x]` checkboxes
4. Push branch: `git push -u origin feature/your-feature`
5. Create PR with `gh pr create`
6. PR description must include:
   - **Summary** section with bullet points
   - **Test Plan** section with checklist

**IMPORTANT:** Before opening any PR, always update the development roadmap (`docs/research/specflux-development-roadmap.md`) to reflect the work completed. This ensures the roadmap stays accurate and helps track overall project progress.

### Example Workflow
```bash
git checkout -b feature/add-task-api
# make changes
git add .
git commit -m "feat: add task CRUD endpoints"
git push -u origin feature/add-task-api
gh pr create --title "feat: add task CRUD endpoints" --body "..."
```

## Development Workflow

### Adding a Feature (API-First)
1. Create feature branch from `main`
2. Update relevant domain spec in `orchestrator/openapi/` (e.g., `tasks.yaml`)
3. Run `npm run generate:client` to create TypeScript client
4. Implement backend handler in `orchestrator/src/routes/`
5. Write backend tests
6. Implement frontend UI
7. Write frontend tests
8. Create PR for review

### Database Changes
1. Create feature branch
2. Create migration file in `migrations/NNN_description.sql` with `-- UP` and `-- DOWN` sections
3. Run `npm run migrate`
4. Update TypeScript types
5. Create PR for review

## Code Patterns

### TypeScript
- Strict mode, no `any` types
- Always async/await, never callbacks
- Typed errors extending `Error` class
- API responses: `{ success: true, data: T } | { success: false, error: string }`

### API Design (Domain-Driven)
- OpenAPI specs organized by domain in `openapi/` folder
- RESTful with plural nouns: `/tasks`, `/epics`, `/projects`
- Nested resources: `/projects/:id/tasks`
- Actions as POST: `/tasks/:id/start`
- Pagination: `?page=1&limit=20`
- Sort with prefix: `?sort=-created_at` (descending)

### React/Frontend
- Functional components only with hooks
- TailwindCSS for styling
- Use generated API client from OpenAPI

## Key Documentation

- **Product Spec:** `docs/research/specflux-product-spec.md` - Complete vision, architecture, workflows, UI wireframes
- **Development Roadmap:** `docs/research/specflux-development-roadmap.md` - Week-by-week implementation plan, database schema, API specs
- **Claude Setup Guide:** `docs/research/claude-developer-setup-guide.md` - MCP servers, skills, agents, commands

## Core Concepts

- **Projects:** Container for multiple repositories
- **Epics:** Large features with PRD and multiple tasks
- **Tasks:** Individual work units executed by Claude Code agents
- **Workflows:** Templates (Startup Fast, Full Lifecycle) defining required phases
- **Approval Gates:** Human review points before downstream tasks proceed
- **Chain Outputs:** Context summaries passed between dependent tasks
- **Worktrees:** Git worktrees for parallel task execution in same repo
