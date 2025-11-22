# Claude Developer Setup for Building SpecFlux

## Project Structure Recommendation

**YES - Operate Claude Code from the top level (one level above orchestrator)**

```
specflux/                          ← Run Claude Code from HERE
├── .git/
├── .claude/                       ← Your Claude configuration
│   ├── .mcp.json                  ← MCP servers
│   ├── skills/                    ← Custom skills
│   │   ├── typescript-patterns/
│   │   ├── tauri-dev/
│   │   ├── api-design/
│   │   └── database-migrations/
│   ├── agents/                    ← Custom agents
│   │   ├── backend-dev.md
│   │   ├── frontend-dev.md
│   │   └── fullstack-dev.md
│   └── commands/                  ← Custom commands
│       ├── test-all.md
│       ├── build-prod.md
│       └── db-migrate.md
├── orchestrator/                  ← The SpecFlux backend
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── CLAUDE.md                  ← Context for orchestrator
├── frontend/                      ← The Tauri desktop app (future)
│   └── CLAUDE.md                  ← Context for frontend
├── docs/
│   ├── specflux-product-spec.md
│   └── specflux-development-roadmap.md
└── README.md

```

**Why top level?**
- Claude can work across both backend and frontend
- Easier to run tests, builds, and git operations
- Single .claude/ folder for all configurations
- Can reference spec docs easily

---

## 1. MCP Servers Setup

### .claude/.mcp.json

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/specflux"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://localhost/specflux_dev"
      }
    }
  }
}
```

**Why these MCPs?**
- **github**: Create issues, PRs, search code, manage projects
- **filesystem**: Read/write files safely (Claude has better file access)
- **postgres**: Database queries if you add Postgres later (optional, you're using SQLite)

**For SQLite development, you might not need the postgres MCP. Just use github + filesystem.**

---

## 2. Skills to Create

### .claude/skills/typescript-patterns/SKILL.md

```markdown
# TypeScript Best Practices for SpecFlux

## Patterns We Use

### Async/Await Pattern
Always use async/await, never callbacks or .then():

```typescript
// ✅ Good
async function createTask(data: CreateTaskRequest): Promise<Task> {
  const task = await db.insert(tasks).values(data).returning();
  return task[0];
}

// ❌ Bad
function createTask(data: CreateTaskRequest): Promise<Task> {
  return db.insert(tasks).values(data).returning().then(result => result[0]);
}
```

### Error Handling
Always use typed errors:

```typescript
class TaskNotFoundError extends Error {
  constructor(taskId: number) {
    super(`Task ${taskId} not found`);
    this.name = 'TaskNotFoundError';
  }
}

// Usage
async function getTask(id: number): Promise<Task> {
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!task) throw new TaskNotFoundError(id);
  return task;
}
```

### Type Safety
Use strict TypeScript, never 'any':

```typescript
// ✅ Good
interface CreateTaskRequest {
  title: string;
  description?: string;
  epic_id?: number;
}

// ❌ Bad
function createTask(data: any) { ... }
```

### API Response Pattern
All API responses follow this structure:

```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// Usage
app.get('/tasks/:id', async (req, res) => {
  try {
    const task = await getTask(Number(req.params.id));
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(404).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});
```

## File Organization

```
src/
├── types/          # Shared TypeScript types
├── services/       # Business logic
├── routes/         # API endpoints
├── db/             # Database schema & migrations
└── utils/          # Helper functions
```
```

---

### .claude/skills/tauri-dev/SKILL.md

```markdown
# Tauri Development Patterns

## IPC Communication

Always define IPC commands with TypeScript types:

```rust
// src-tauri/src/main.rs
#[tauri::command]
fn start_agent(task_id: i32) -> Result<(), String> {
    // Implementation
    Ok(())
}
```

```typescript
// frontend/src/api/tauri.ts
import { invoke } from '@tauri-apps/api/tauri';

export async function startAgent(taskId: number): Promise<void> {
  await invoke('start_agent', { taskId });
}
```

## Window Management

Create windows programmatically:

```typescript
import { WebviewWindow } from '@tauri-apps/api/window';

const taskWindow = new WebviewWindow('task-detail', {
  url: '/task/42',
  title: 'Task #42',
  width: 800,
  height: 600
});
```

## Testing Tauri Commands

```typescript
// tests/tauri.test.ts
import { mockIPC } from '@tauri-apps/api/mocks';

describe('Tauri IPC', () => {
  beforeEach(() => {
    mockIPC((cmd, args) => {
      if (cmd === 'start_agent') {
        return Promise.resolve();
      }
    });
  });

  test('starts agent', async () => {
    await expect(startAgent(42)).resolves.toBeUndefined();
  });
});
```
```

---

### .claude/skills/api-design/SKILL.md

```markdown
# API Design Patterns for SpecFlux

## RESTful Conventions

Follow these patterns consistently:

### Resource Naming
- Use plural nouns: `/tasks`, `/epics`, `/projects`
- Nested resources: `/projects/:id/tasks`
- Actions as POST to sub-resources: `/tasks/:id/start`

### HTTP Methods
- `GET` - Read (list or single)
- `POST` - Create or action
- `PUT` - Full update
- `PATCH` - Partial update
- `DELETE` - Remove

### Response Codes
- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Server Error

### Pagination
All list endpoints support pagination:

```typescript
GET /projects/1/tasks?page=1&limit=20&status=in-progress

Response:
{
  "success": true,
  "data": {
    "tasks": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### Filtering & Sorting
```typescript
GET /tasks?epic_id=5&repo=backend&status=ready&sort=-created_at

// Sort: prefix with '-' for descending
```

## OpenAPI First

Always update openapi.yaml BEFORE implementing endpoints:

1. Add endpoint definition
2. Add request/response schemas
3. Generate TypeScript client: `npm run generate:client`
4. Implement backend handler
5. Use generated types in frontend
```

---

### .claude/skills/database-migrations/SKILL.md

```markdown
# Database Migration Patterns

## Migration Files

Keep migrations simple and atomic:

```sql
-- migrations/003_add_notifications.sql
-- UP
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  task_id INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX idx_notifications_project_id ON notifications(project_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- DOWN
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_notifications_project_id;
DROP TABLE notifications;
```

## Migration Runner

```typescript
// src/db/migrate.ts
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export async function runMigrations(db: Database.Database) {
  // Create migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get applied migrations
  const applied = db.prepare('SELECT name FROM migrations').all() as { name: string }[];
  const appliedNames = new Set(applied.map(m => m.name));

  // Read migration files
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  // Apply pending migrations
  for (const file of files) {
    if (appliedNames.has(file)) continue;

    console.log(`Applying migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const upSQL = sql.split('-- DOWN')[0].replace('-- UP', '').trim();

    db.exec(upSQL);
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
  }
}
```

## Testing Migrations

Always test UP and DOWN:

```bash
# Test UP
npm run migrate

# Test DOWN (rollback)
npm run migrate:rollback

# Test UP again
npm run migrate
```
```

---

## 3. Agents to Create

### .claude/agents/backend-dev.md

```markdown
You are a backend developer specializing in Node.js, TypeScript, and Express.

## Your Focus
- Implement REST API endpoints following OpenAPI spec
- Write database queries with better-sqlite3
- Create comprehensive tests with Jest
- Handle errors gracefully with typed errors
- Follow patterns in .claude/skills/

## Your Tools
- Read openapi.yaml for endpoint definitions
- Check CLAUDE.md in orchestrator/ for architecture
- Run `npm test` before committing
- Use `npm run lint` to check code style

## Your Workflow
1. Read the task description
2. Check if OpenAPI spec exists for the endpoint
3. Implement the endpoint following TypeScript patterns
4. Write unit tests
5. Run tests and lint
6. Update CLAUDE.md if you add new patterns

## Code Style
- Use async/await exclusively
- Type everything (no 'any')
- Prefer functional patterns
- Keep functions small (<50 lines)
- Add JSDoc comments for public APIs

## Testing Requirements
- Unit tests for all service functions
- Integration tests for API endpoints
- Test error cases, not just happy path
- Aim for >80% code coverage
```

---

### .claude/agents/frontend-dev.md

```markdown
You are a frontend developer specializing in React, TypeScript, and Tauri.

## Your Focus
- Build React components with TypeScript
- Use TailwindCSS for styling
- Integrate with generated API client
- Follow React best practices (hooks, functional components)
- Create responsive, accessible UIs

## Your Tools
- Use generated API client from backend OpenAPI spec
- Check CLAUDE.md in frontend/ for architecture
- Run `npm test` for component tests
- Use `npm run dev` to test in Tauri

## Your Workflow
1. Read the task description
2. Check if API client methods exist (from OpenAPI)
3. Create React components
4. Write component tests
5. Test in Tauri window
6. Ensure responsive design

## Code Style
- Functional components only
- Use hooks (useState, useEffect, custom hooks)
- Extract logic into custom hooks
- Use TypeScript interfaces for props
- Keep components small and focused

## UI Guidelines
- Follow wireframes in specflux-product-spec.md
- Use Tailwind utility classes
- Ensure keyboard navigation works
- Test on different screen sizes
- Follow color scheme and spacing consistently
```

---

### .claude/agents/fullstack-dev.md

```markdown
You are a fullstack developer who can work on both backend and frontend.

## Your Focus
- Implement complete features end-to-end
- Update OpenAPI spec, then implement backend, then frontend
- Ensure type safety across the stack
- Write tests at all layers

## Your Workflow
1. Read task description and product spec
2. Update openapi.yaml with new endpoints
3. Generate TypeScript client: `npm run generate:client`
4. Implement backend endpoint
5. Write backend tests
6. Implement frontend UI
7. Write frontend tests
8. Test the complete feature

## When to Use Me
- Implementing complete features (e.g., "Task approval flow")
- Bug fixes that span frontend and backend
- Performance optimizations
- Refactoring that affects both layers

## Your Strengths
- Understanding data flow across the stack
- Optimizing API design for frontend needs
- Ensuring type consistency
- End-to-end testing
```

---

## 4. Commands to Create

### .claude/commands/test-all.md

```markdown
Run all tests across the project.

## Steps
1. `cd orchestrator && npm test`
2. `cd ../frontend && npm test`
3. Report results

## Success Criteria
- All backend tests pass
- All frontend tests pass
- No TypeScript errors
- No linting errors
```

---

### .claude/commands/build-prod.md

```markdown
Build production artifacts.

## Steps
1. `cd orchestrator && npm run build`
2. `cd ../frontend && npm run tauri build`
3. Verify artifacts created:
   - `orchestrator/dist/`
   - `frontend/src-tauri/target/release/`

## Success Criteria
- No build errors
- All TypeScript compiles
- Tauri app bundles successfully
```

---

### .claude/commands/db-migrate.md

```markdown
Run database migrations.

## Steps
1. `cd orchestrator`
2. `npm run migrate`
3. Verify migration was applied
4. Run tests to ensure schema is correct

## Success Criteria
- Migration runs without errors
- Tests pass with new schema
```

---

### .claude/commands/api-spec-update.md

```markdown
Update API specification and regenerate client.

## Steps
1. Review changes to `openapi.yaml`
2. Validate OpenAPI spec: `npm run validate:openapi`
3. Generate TypeScript client: `npm run generate:client`
4. Check for breaking changes in client
5. Update frontend code if needed

## Success Criteria
- OpenAPI spec is valid
- TypeScript client generates successfully
- No breaking changes (or documented)
```

---

## 5. Root CLAUDE.md

### CLAUDE.md (at specflux/ root)

```markdown
# SpecFlux - AI-Powered Multi-Repo Development Orchestrator

## What is SpecFlux?
Desktop app (Tauri) that orchestrates Claude Code agents across multiple repositories. Think of it as a visual project management layer on top of Claude Code.

## Architecture
- **Backend** (`orchestrator/`): Node.js + TypeScript + Express + SQLite
- **Frontend** (`frontend/`): React + TypeScript + Tauri
- **Communication**: REST API with auto-generated TypeScript client

## Key Concepts

### Projects
A project contains multiple repositories and tracks development across them.

### Epics
Large features broken down into tasks across repositories.

### Tasks
Individual units of work executed by Claude Code agents.

### Workflows
Templates (Startup Fast, Full Lifecycle) that define required phases.

## Build Commands
```bash
# Backend
cd orchestrator
npm install
npm run dev          # Start backend server
npm test             # Run tests
npm run migrate      # Run database migrations

# Frontend (coming soon)
cd frontend
npm install
npm run tauri dev    # Start Tauri app
npm run tauri build  # Build production app

# Full Stack
npm run test:all     # Test everything
npm run build:all    # Build everything
```

## Development Workflow

### Adding a New Feature
1. Update `openapi.yaml` with new endpoints
2. Run `npm run generate:client` to create TypeScript client
3. Implement backend handler in `orchestrator/src/routes/`
4. Write backend tests
5. Implement frontend UI in `frontend/src/`
6. Write frontend tests
7. Test end-to-end

### Database Changes
1. Create migration file in `migrations/NNN_description.sql`
2. Run `npm run migrate`
3. Update TypeScript types if needed
4. Run tests

## Code Style
- TypeScript strict mode (no 'any')
- Async/await (no callbacks)
- Functional React components
- TailwindCSS for styling
- Jest for testing

## Documentation
- Product Spec: `docs/specflux-product-spec.md`
- Development Roadmap: `docs/specflux-development-roadmap.md`
- API Reference: Generated from OpenAPI spec

## File Structure
```
specflux/
├── orchestrator/         # Backend service
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── db/          # Database layer
│   │   └── types/       # TypeScript types
│   ├── tests/
│   ├── migrations/
│   └── openapi.yaml     # API specification
├── frontend/            # Tauri desktop app
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── api/         # Generated API client
│   │   └── hooks/       # Custom React hooks
│   └── src-tauri/       # Rust/Tauri code
├── .claude/             # Claude configuration
│   ├── .mcp.json
│   ├── skills/
│   ├── agents/
│   └── commands/
└── docs/
```

## Current Status
Week 1-2: Backend foundation, database setup, basic API
See `docs/specflux-development-roadmap.md` for detailed plan.
```

---

## 6. Package.json Scripts (Root Level)

Add these to your root `package.json`:

```json
{
  "name": "specflux",
  "private": true,
  "workspaces": ["orchestrator", "frontend"],
  "scripts": {
    "dev:backend": "cd orchestrator && npm run dev",
    "dev:frontend": "cd frontend && npm run tauri dev",
    "test:all": "npm run test --workspaces",
    "build:all": "npm run build --workspaces",
    "migrate": "cd orchestrator && npm run migrate",
    "generate:client": "cd orchestrator && npm run generate:client && cp -r generated-client ../frontend/src/api/generated",
    "lint:all": "npm run lint --workspaces"
  }
}
```

---

## Quick Start Checklist

```bash
# 1. Setup project structure
mkdir -p specflux/{orchestrator,frontend,.claude/{skills,agents,commands},docs}
cd specflux

# 2. Initialize git
git init

# 3. Create .claude/.mcp.json (use template above)

# 4. Create all skills (copy templates above)
# - typescript-patterns/SKILL.md
# - tauri-dev/SKILL.md
# - api-design/SKILL.md
# - database-migrations/SKILL.md

# 5. Create all agents
# - backend-dev.md
# - frontend-dev.md
# - fullstack-dev.md

# 6. Create all commands
# - test-all.md
# - build-prod.md
# - db-migrate.md
# - api-spec-update.md

# 7. Create root CLAUDE.md

# 8. Run Claude Code from specflux/ root
claude code
```

---

## Summary

### ✅ MCP Servers
- GitHub (issues, PRs, code search)
- Filesystem (file operations)

### ✅ Skills (4)
- TypeScript patterns
- Tauri development
- API design
- Database migrations

### ✅ Agents (3)
- Backend developer
- Frontend developer
- Fullstack developer

### ✅ Commands (4)
- Test all
- Build production
- Database migrate
- API spec update

### ✅ Project Structure
- Run Claude Code from root (specflux/)
- Single .claude/ folder for all configs
- Root CLAUDE.md for overall context
- orchestrator/CLAUDE.md for backend specifics
- frontend/CLAUDE.md for frontend specifics

This setup will make Claude Code incredibly effective at helping you build SpecFlux!
