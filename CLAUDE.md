# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpecFlux is a desktop application (Tauri + React) that orchestrates Claude Code AI agents across multiple software repositories. It transforms "vibe coding" into disciplined, spec-driven engineering by providing a unified Kanban board for multi-repo project management, automatic Claude Code agent launching with context injection, and human-in-the-loop approval workflows.

## Architecture

This is a **monorepo for the frontend/desktop app only**. The backend is a separate repository.

- **This repo (specflux):** Tauri desktop app with React frontend
- **Backend repo:** [specflux-backend](https://github.com/specflux/specflux-backend) - Spring Boot 4 + Java 25 + PostgreSQL

## Tech Stack

### Frontend (this repo)
- **Desktop:** Tauri 2.x (Rust)
- **UI:** React 18+, TypeScript (strict), TailwindCSS
- **Terminal:** xterm.js with WebSocket
- **Testing:** Vitest + React Testing Library
- **API Client:** Auto-generated from OpenAPI spec

### Backend (separate repo)
- **Framework:** Spring Boot 4.0, Java 25
- **Database:** PostgreSQL (via Testcontainers for tests)
- **Auth:** Firebase Authentication
- **API:** RESTful with OpenAPI/Swagger

## Project Structure

```
specflux/                      <- This repo (frontend/desktop)
├── .claude/                   # Claude Code configuration
│   ├── .mcp.json              # MCP servers (GitHub, Playwright)
│   ├── skills/                # Coding pattern guides
│   │   ├── api-design/
│   │   ├── database-migrations/
│   │   ├── springboot-patterns/
│   │   ├── tauri-dev/
│   │   ├── typescript-patterns/
│   │   └── ui-patterns/
│   ├── agents/                # Specialized agent definitions
│   │   ├── backend-dev.md
│   │   ├── frontend-dev.md
│   │   └── fullstack-dev.md
│   └── commands/              # Custom slash commands
├── src/                       # React application
│   ├── api/                   # Generated API client
│   ├── components/            # React components
│   │   ├── kanban/
│   │   ├── layout/
│   │   ├── terminal/
│   │   └── ui/
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom hooks
│   ├── pages/                 # Page components
│   ├── services/              # Service layer
│   └── utils/                 # Utilities
├── src-tauri/                 # Tauri/Rust code
│   ├── src/                   # Rust source
│   └── tauri.conf.json        # Tauri config
├── openapi/                   # OpenAPI spec (synced from backend)
│   └── api.yaml               # Full API specification
└── docs/research/             # Product specs and roadmap

specflux-backend/              <- Separate repo
├── src/main/java/com/specflux/
│   ├── project/               # Project domain
│   ├── epic/                  # Epic domain
│   ├── task/                  # Task domain
│   ├── user/                  # User domain
│   ├── agent/                 # Agent domain
│   ├── repository/            # Repository domain
│   ├── release/               # Release domain
│   ├── skill/                 # Skill domain
│   └── shared/                # Shared infrastructure
└── src/test/java/             # Tests
```

## Build Commands

```bash
# Frontend (this repo)
npm install              # Install dependencies
npm run dev              # Vite dev server (browser only)
npm run tauri:dev        # Full Tauri desktop app
npm run tauri:build      # Production build
npm test                 # Run Vitest tests
npm run test:coverage    # Tests with coverage
npm run lint             # ESLint
npm run typecheck        # TypeScript check
npm run generate:client  # Regenerate API client from OpenAPI

# Quick start (uses run.sh)
./run.sh                 # Run desktop app
./run.sh web             # Run web dev server only

# Backend (separate repo - clone from GitHub)
# git clone https://github.com/specflux/specflux-backend.git
cd specflux-backend
./mvnw spring-boot:run   # Start backend (port 8090)
./mvnw test              # Run tests
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
3. Push branch: `git push -u origin feature/your-feature`
4. Create PR with `gh pr create`
5. PR description must include:
   - **Summary** section with bullet points
   - **Test Plan** section with checklist

## Development Workflow

### API-First Development (CRITICAL)

**All API changes MUST start with the OpenAPI specification.** This ensures contract-first development where both frontend and backend agree on the API before implementation.

#### Adding or Modifying API Endpoints
1. **Update OpenAPI spec first** - Edit `openapi/api.yaml` with the new/modified endpoints
2. **Generate frontend client** - Run `npm run generate:client` to create TypeScript types
3. **Implement backend** - Create Spring Boot controller matching the spec exactly
4. **Implement frontend** - Use the generated client to call the API

#### Why OpenAPI First?
- **Single source of truth** for API contracts
- **Type safety** - Frontend gets typed client automatically
- **Documentation** - Swagger UI available at `/swagger-ui.html`
- **Validation** - Backend can validate requests against spec
- **No drift** - Frontend and backend always in sync

#### Example: Adding a New Endpoint
```bash
# 1. Edit openapi/api.yaml - add your endpoint definition
# 2. Generate client
npm run generate:client

# 3. Implement backend controller (must match spec exactly)
# 4. Use generated client in frontend
import { api } from '../api';
const result = await api.yourDomain.yourEndpoint({ ... });
```

### Adding a Frontend Feature
1. Create feature branch from `main`
2. If API changes needed, **update `openapi/api.yaml` FIRST**
3. Run `npm run generate:client` to regenerate TypeScript client
4. Implement React components/pages
5. Write tests with Vitest
6. Create PR for review

### Adding a Backend Feature
1. Create feature branch from `main` in `specflux-backend`
2. **Update `openapi/api.yaml` in frontend repo FIRST** (or coordinate the spec)
3. Implement Spring Boot controller matching the OpenAPI spec
4. Write tests
5. Create PR for review

### API Client Generation
The frontend uses an auto-generated TypeScript client from the OpenAPI spec:
```bash
npm run generate:client
```
This generates code in `src/api/generated/` from `openapi/api.yaml`.

## Code Patterns

### TypeScript
- Strict mode, no `any` types
- Always async/await, never callbacks
- Typed errors extending `Error` class

### React/Frontend
- Functional components only with hooks
- TailwindCSS for styling
- Use generated API client from OpenAPI
- **UI Patterns:** Use the `ui-patterns` skill when working on UI components
- **Dark Mode:** All components MUST support dark mode with `dark:` variants
- **Component Classes:** Use `.btn`, `.input`, `.select`, `.card` from `src/index.css`
- **Colors:** Brand (blue) for actions, System (slate) for chrome, Semantic (emerald/amber/red) for status

### API Design (Domain-Driven)
- RESTful with plural nouns: `/tasks`, `/epics`, `/projects`
- Nested resources: `/projects/{projectRef}/tasks`
- Actions as POST: `/tasks/{taskRef}/start`
- Pagination with cursor-based approach
- All endpoints require Firebase auth token

## Key Documentation

- **Product Spec:** `docs/research/specflux-product-spec.md` - Complete vision, architecture, workflows
- **Development Roadmap:** `docs/research/specflux-development-roadmap.md` - Implementation plan

## Core Concepts

- **Projects:** Container for multiple repositories
- **Epics:** Large features with PRD and multiple tasks
- **Tasks:** Individual work units executed by Claude Code agents
- **Workflows:** Templates defining required phases
- **Approval Gates:** Human review points before downstream tasks proceed
- **Worktrees:** Git worktrees for parallel task execution in same repo

## Desktop OAuth Flow

SpecFlux is a **desktop application** - all OAuth flows must redirect back to a local server, not a web URL.

### How It Works

1. Desktop app starts a local OAuth server on a random port (e.g., `http://localhost:8765`)
2. App opens browser to backend: `/api/github/install?redirect_uri=http://localhost:8765`
3. Backend encodes `redirect_uri` in OAuth `state` parameter (Base64 JSON)
4. Backend redirects to GitHub OAuth with the encoded state
5. User authorizes on GitHub
6. GitHub redirects to backend callback with code + state
7. Backend exchanges code for tokens, stores in DB
8. Backend extracts `redirect_uri` from state, redirects there with success/error
9. Desktop app's local server captures the callback
10. App updates UI and closes local server

### Key Files

- **Frontend:** `src/services/githubConnection.ts` - Starts local server, opens OAuth URL
- **Frontend:** `src/lib/oauth-tauri.ts` - Tauri OAuth plugin wrapper
- **Backend:** `GithubController.java` - Handles install/callback with `redirect_uri` in state

### Important

- Always pass `redirect_uri` when initiating OAuth from the desktop app
- The backend's `frontendUrl` config is NOT used for desktop OAuth
- Use `@fabianlars/tauri-plugin-oauth` for the local callback server

## Running the Full Stack

```bash
# Terminal 1: Start backend (clone if needed)
cd specflux-backend
./mvnw spring-boot:run

# Terminal 2: Start frontend
cd specflux
./run.sh
```

Backend runs on http://localhost:8090
Frontend runs on http://localhost:5173 (web) or as desktop app
