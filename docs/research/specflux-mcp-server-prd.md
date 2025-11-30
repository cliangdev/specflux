# SpecFlux Cloud Backend & MCP Server PRD

## Table of Contents

1. [Overview](#overview)
2. [Goals](#goals)
3. [Architecture](#architecture)
4. [Data Model](#data-model)
5. [REST API](#rest-api)
6. [MCP Server](#mcp-server)
7. [SpecFlux Agent](#specflux-agent)
8. [Data Migration](#data-migration)
9. [Implementation Phases](#implementation-phases)
10. [Success Metrics](#success-metrics)
11. [Security Considerations](#security-considerations)
12. [Future Enhancements](#future-enhancements)

---

## Overview

This document defines the plan for migrating SpecFlux from a local-only desktop application to a cloud-enabled platform with an MCP server for AI agent integration.

**Current State:** Node.js/Express backend with SQLite, runs locally via Tauri desktop app.

**Target State:** Spring Boot backend with PostgreSQL on cloud, MCP server for Claude integration, desktop app connects to cloud API.

## Goals

1. **Cloud Backend** - Migrate REST API to Spring Boot with PostgreSQL for multi-user support
2. **Seamless AI Integration** - MCP server enables Claude to manage projects through natural conversation
3. **PRD-to-Tasks Workflow** - AI can analyze PRDs and generate structured epic/task breakdowns
4. **Single-Project Focus** - MCP session operates on one project at a time, with ability to switch
5. **Data Migration** - Provide tooling to migrate existing local data to cloud

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Tauri Desktop App                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │ Local-Only   │  │   Claude     │          │
│  │              │  │  Features    │  │   Code       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
         │                                      │
         │ REST API                             │ MCP Protocol
         ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Spring Boot Backend (Cloud)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  REST API    │  │  Services    │  │  MCP Server  │          │
│  │  Controllers │  │  (Business)  │  │  Module      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                           │                                      │
│                    JPA/Hibernate                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │  PostgreSQL  │
                   └──────────────┘
```

### Local-Only Features (Remain in Desktop App)

| Feature | Reason |
|---------|--------|
| File browser | Requires local filesystem |
| Git operations | Requires local git/worktrees |
| Claude Code process control | Spawns local processes |
| Terminal embedding | Local PTY access |

## Data Model

### Authentication (Firebase)

User authentication is handled by Firebase Authentication. The backend validates Firebase JWT tokens and maintains a local user profile.

| Firebase Provides | Backend Stores |
|-------------------|----------------|
| UID (stable identifier) | Reference to Firebase UID |
| Email, display name | Cached profile data |
| JWT tokens | - (validated per request) |
| OAuth providers | - (handled by Firebase) |

### ID Strategy

SpecFlux uses a dual-ID system for database performance and user experience:

| ID Type | Purpose | Format | Example |
|---------|---------|--------|---------|
| **Internal ID** | Database primary key | Auto-increment bigint | `847291` |
| **Public ID** | API responses, integrations | Prefixed nanoid | `task_V1StGXR8_Z5jdHi` |
| **Display Key** | Human-readable reference | Project key + sequence | `SPEC-42` |

### Entity ID Formats

| Entity | Public ID Prefix | Display Key Format | Example |
|--------|------------------|-------------------|---------|
| User | `user_` | - | `user_V1StGXR8` |
| Project | `proj_` | `{KEY}` | `SPEC` |
| Epic | `epic_` | `{KEY}-E{seq}` | `SPEC-E5` |
| Task | `task_` | `{KEY}-{seq}` | `SPEC-42` |
| Release | `rel_` | `{KEY}-R{seq}` | `SPEC-R2` |

Note: Firebase UID is internal only (stored in `users.firebase_uid`), never exposed in API responses.

### Project Keys

- User-defined, 2-10 uppercase alphanumeric characters
- Unique across all projects
- Examples: `SPEC`, `ACME`, `WEBAPP`

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles (firebase_uid, email, display_name) |
| `projects` | Projects with key, sequences, owner_id |
| `epics` | Epics with sequence_number |
| `tasks` | Tasks with sequence_number |
| `releases` | Releases/milestones |
| `project_members` | User-project membership with roles |
| `task_dependencies` | Task blocking relationships |
| `acceptance_criteria` | Criteria for tasks/epics |

### Future: Team Support

The current model supports single-user ownership with `project_members` for future expansion:

| Current (Phase 1) | Future (Teams) |
|-------------------|----------------|
| Projects have `owner_id` | Projects have `team_id` |
| `project_members` for sharing | `teams` table added |
| User creates/owns projects | Team owns projects, users are members |

**Design decisions to preserve flexibility:**
- Use `project_members` table now (not direct user_id on projects for access)
- Keep `owner_id` on projects (becomes `created_by` when teams added)
- Roles in `project_members` (owner, admin, member) ready for team RBAC

## REST API

API endpoints accept both public IDs and display keys where applicable.

### Project Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{ref}` | Get project (by key or public ID) |
| PUT | `/api/projects/{ref}` | Update project |
| DELETE | `/api/projects/{ref}` | Delete project |
| GET | `/api/projects/{ref}/dashboard` | Dashboard data |
| GET | `/api/projects/{ref}/stats` | Project statistics |

### Epic Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/{ref}/epics` | List epics |
| POST | `/api/projects/{ref}/epics` | Create epic |
| GET | `/api/projects/{ref}/epics/{ref}` | Get epic |
| PUT | `/api/projects/{ref}/epics/{ref}` | Update epic |
| DELETE | `/api/projects/{ref}/epics/{ref}` | Delete epic |
| GET | `/api/projects/{ref}/epics/{ref}/tasks` | Get epic's tasks |

### Task Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/{ref}/tasks` | List tasks (with filters) |
| POST | `/api/projects/{ref}/tasks` | Create task |
| GET | `/api/projects/{ref}/tasks/{ref}` | Get task |
| PATCH | `/api/projects/{ref}/tasks/{ref}` | Update task |
| DELETE | `/api/projects/{ref}/tasks/{ref}` | Delete task |
| GET | `/api/projects/{ref}/tasks/{ref}/dependencies` | List dependencies |
| POST | `/api/projects/{ref}/tasks/{ref}/dependencies` | Add dependency |

### Release Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/{ref}/releases` | List releases |
| POST | `/api/projects/{ref}/releases` | Create release |
| GET | `/api/projects/{ref}/releases/{ref}` | Get release |
| PUT | `/api/projects/{ref}/releases/{ref}` | Update release |
| GET | `/api/projects/{ref}/releases/{ref}/roadmap` | Get roadmap |

## MCP Server

### Project Context Model

The MCP server operates with a **single active project** at a time:

- On startup, no project is selected
- User selects project via `switch_project` tool
- All subsequent operations target the active project
- Context persists for the MCP session duration

### MCP Tools

#### Project Context Tools
| Tool | Description | Requires Project |
|------|-------------|------------------|
| `list_projects` | List all user's projects | No |
| `switch_project` | Set active project | No |
| `get_current_project` | Get active project details | Yes |

#### Epic Tools
| Tool | Description |
|------|-------------|
| `list_epics` | List epics in current project |
| `create_epic` | Create epic |
| `get_epic` | Get epic with progress |
| `update_epic` | Update epic |
| `delete_epic` | Delete epic |

#### Task Tools
| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks (with filters) |
| `create_task` | Create task |
| `get_task` | Get task details |
| `update_task` | Update task |
| `delete_task` | Delete task |
| `add_task_dependency` | Add dependency |

#### Release Tools
| Tool | Description |
|------|-------------|
| `list_releases` | List releases |
| `create_release` | Create release |
| `get_project_stats` | Get project statistics |

### MCP Prompts

| Prompt | Description |
|--------|-------------|
| `prd-breakdown` | Extract epics, tasks, dependencies from PRD |
| `task-refinement` | Generate acceptance criteria and scope |
| `epic-planning` | Break epic into tasks with dependencies |

## SpecFlux Agent

A dedicated Claude Code agent auto-generated for each project at `.claude/agents/specflux.md`.

### Capabilities

| Capability | Description |
|------------|-------------|
| **Project Context** | Automatically handles project switching |
| **Workflow Guidance** | Knows correct order: project → epic → task → dependencies |
| **Display Keys** | References entities as SPEC-42 in responses |
| **Acceptance Criteria** | Creates well-structured, testable criteria |
| **Dependency Suggestions** | Identifies task dependencies proactively |

### Behavior

- Checks for active project on first invocation
- Confirms operations with display keys (e.g., "Created SPEC-42")
- Warns if creating orphan tasks (no epic)
- Suggests logical task ordering

## Data Migration

### Migration Scope

| Source (Local) | Target (Cloud) |
|----------------|----------------|
| SQLite | PostgreSQL |
| Auto-increment IDs | Public IDs + Display Keys |
| Single user | Multi-user with auth |

### Migration Strategy

1. **Export Tool** - CLI command in desktop app exports local SQLite data to JSON
2. **ID Mapping** - Generate public IDs and display keys for all entities
3. **Import API** - Cloud backend endpoint accepts migration payload
4. **Validation** - Verify entity counts, relationships preserved
5. **Cutover** - User switches desktop app to cloud API endpoint

### Migration Considerations

| Consideration | Approach |
|---------------|----------|
| **ID References** | Map old IDs to new public IDs, update all foreign keys |
| **Project Keys** | User assigns project key during migration |
| **Sequence Numbers** | Preserve creation order, assign sequences accordingly |
| **Timestamps** | Preserve original created_at/updated_at |
| **User Mapping** | Associate all data with authenticated cloud user |

## Implementation Phases

### Phase 1: Spring Boot Backend Setup
- Initialize Spring Boot project with DDD package structure
- Configure PostgreSQL with Flyway migrations
- Implement core entities: User, Project, Epic, Task
- Implement ID strategy (internal ID, public ID, display key)
- Firebase Authentication integration

### Phase 2: REST API Implementation
- Implement all REST endpoints matching current OpenAPI spec
- Add support for display key resolution in path parameters
- Pagination, filtering, sorting
- Error handling and validation
- API documentation (OpenAPI/Swagger)

### Phase 3: Cloud Deployment
- Provision Oracle Cloud ARM Compute Instance (free tier)
- Setup PostgreSQL database (Oracle Cloud or external)
- Configure reverse proxy (nginx) with SSL
- CI/CD pipeline for ARM builds (GitHub Actions with ARM runner or cross-compile)
- Environment configuration and secrets management
- Health monitoring and logging

### Phase 4: Desktop App Integration
- Update frontend API client to support cloud endpoint
- Add cloud/local mode toggle in settings
- Implement Firebase Auth flow (login, token management)
- Test all features against cloud backend

### Phase 5: Data Migration Tooling
- Build export command in desktop app
- Build import endpoint in cloud backend
- ID mapping and display key generation
- Migration validation and rollback support
- User documentation for migration process

### Phase 6: MCP Server Implementation
- Add MCP module to Spring Boot backend
- Implement stdio JSON-RPC transport
- Implement project context tools (list, switch, get)
- Implement epic and task tools
- Implement release and stats tools

### Phase 7: Agent & Prompts
- Create SpecFlux agent template
- Implement MCP prompts (prd-breakdown, etc.)
- Auto-generation of agent on project creation
- Testing with Claude Code

### Phase 8: Polish & Launch
- End-to-end testing
- Performance optimization
- Monitoring and alerting
- User documentation
- Beta rollout

## Success Metrics

| Metric | Target |
|--------|--------|
| API Response Time | p95 < 200ms |
| Migration Success Rate | > 99% |
| MCP Tool Usage | 10+ calls/project/week |
| PRD Breakdown Time | < 5 minutes |

## Security Considerations

| Area | Approach |
|------|----------|
| **Authentication** | Firebase Auth (JWT validation on backend) |
| **Authorization** | Project membership checks via `project_members` |
| **Data Isolation** | Users only see projects they're members of |
| **API Security** | Rate limiting, input validation |
| **MCP Security** | Firebase token passed via environment variable |

## Future Enhancements

1. **Team Collaboration** - Multiple users per project with roles
2. **Real-time Updates** - WebSocket notifications for task changes
3. **Custom MCP Tools** - Project-defined tools via configuration
4. **Analytics Dashboard** - Project velocity, completion trends
5. **Integrations** - GitHub, Linear, Jira sync
