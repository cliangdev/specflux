# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpecFlux is a desktop application (Tauri + React) that orchestrates Claude Code AI agents across multiple software repositories. It transforms "vibe coding" into disciplined, spec-driven engineering by providing a unified Kanban board for multi-repo project management, automatic Claude Code agent launching with context injection, and human-in-the-loop approval workflows.

**Current Status:** Project structure initialized with Claude Code configuration, npm workspaces, and package.json files. Ready for implementation.

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

## Development Workflow

### Adding a Feature (API-First)
1. Update relevant domain spec in `orchestrator/openapi/` (e.g., `tasks.yaml`)
2. Run `npm run generate:client` to create TypeScript client
3. Implement backend handler in `orchestrator/src/routes/`
4. Write backend tests
5. Implement frontend UI
6. Write frontend tests

### Database Changes
1. Create migration file in `migrations/NNN_description.sql` with `-- UP` and `-- DOWN` sections
2. Run `npm run migrate`
3. Update TypeScript types

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
