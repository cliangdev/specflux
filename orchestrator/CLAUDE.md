# Orchestrator - Backend Service

This file provides context for Claude Code when working in the orchestrator (backend) directory.

## Overview

The orchestrator is a Node.js/Express backend service that manages:
- Projects, epics, and tasks
- Database operations (SQLite)
- REST API endpoints
- File system operations
- Git integration

## Architecture

```
orchestrator/
├── src/
│   ├── app.ts              # Express app setup
│   ├── index.ts            # Entry point
│   ├── routes/             # API route handlers
│   │   ├── index.ts        # Route aggregator + health check
│   │   ├── projects.routes.ts
│   │   ├── epics.routes.ts
│   │   ├── tasks.routes.ts
│   │   ├── users.routes.ts
│   │   ├── repositories.routes.ts
│   │   ├── notifications.routes.ts
│   │   └── files.routes.ts
│   ├── services/           # Business logic
│   │   ├── project.service.ts
│   │   ├── epic.service.ts
│   │   ├── task.service.ts
│   │   ├── user.service.ts
│   │   ├── repository.service.ts
│   │   └── notification.service.ts
│   ├── middleware/         # Express middleware
│   │   └── auth.middleware.ts   # X-User-Id header auth
│   ├── db/                 # Database layer
│   │   ├── index.ts        # Connection management
│   │   ├── migrate.ts      # Migration runner
│   │   └── rollback.ts     # Rollback migrations
│   └── types/              # TypeScript types
├── migrations/             # SQL migration files
│   └── 001_initial_schema.sql
├── openapi/                # API specifications
│   ├── index.yaml          # Main entry point
│   ├── paths/              # Endpoint definitions by domain
│   ├── schemas/            # Data models
│   └── bundled.yaml        # Generated bundle for client
└── data/                   # SQLite database (gitignored)
```

## Database

**Engine:** SQLite with better-sqlite3

**Tables (13):**
- `users` - User accounts
- `sessions` - Auth sessions (future web use)
- `projects` - Multi-repo project containers
- `project_members` - User-project associations
- `project_config` - Workflow configuration per project
- `repositories` - Git repos linked to projects
- `epics` - Feature groups with PRDs
- `tasks` - Work units executed by agents
- `task_dependencies` - Task blocking relationships
- `approvals` - Review decisions
- `chain_outputs` - Context summaries for chaining
- `worktrees` - Git worktree tracking
- `active_agents` - Running Claude Code processes
- `notifications` - User notifications

**Key Patterns:**
- Foreign keys enforced via `PRAGMA foreign_keys = ON`
- WAL mode for concurrent access
- In-memory database for tests

## API Design

**Authentication:** All endpoints (except `/health`) require `X-User-Id` header.

**Response Envelope:**
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string }
```

**Route Organization:**
- `/api/health` - Health check (no auth)
- `/api/users/me` - Current user
- `/api/projects` - Project CRUD
- `/api/projects/:id/epics` - Epics within project
- `/api/projects/:id/tasks` - Tasks within project
- `/api/epics/:id` - Epic operations
- `/api/tasks/:id` - Task operations
- `/api/repositories/:id` - Repository operations
- `/api/notifications` - Notification operations

## Commands

```bash
npm run dev          # Start with hot reload (nodemon)
npm run build        # Compile TypeScript
npm test             # Run Jest tests
npm run lint         # ESLint check
npm run typecheck    # TypeScript check
npm run migrate      # Run pending migrations
npm run migrate:rollback  # Rollback last migration
npm run bundle:openapi    # Bundle OpenAPI spec
npm run generate:client   # Generate TS client for frontend
npm run validate:openapi  # Validate OpenAPI spec
```

## Adding a New Endpoint

1. Define in `openapi/paths/{domain}.yaml`
2. Run `npm run bundle:openapi`
3. Add route in `src/routes/{domain}.routes.ts`
4. Add service logic in `src/services/{domain}.service.ts`
5. Write tests in `src/__tests__/`
6. Run `npm run generate:client` to update frontend client

## Adding a Migration

1. Create `migrations/NNN_description.sql`
2. Include `-- UP` and `-- DOWN` sections
3. Run `npm run migrate`
4. Update TypeScript types if needed

## Testing

- Tests use in-memory SQLite database
- Each test file gets fresh database
- Use `supertest` for API integration tests
- Mock external services (git, file system) as needed
