# SpecFlux Cloud Backend PRD

## Table of Contents

1. [Overview](#overview)
2. [Goals](#goals)
3. [Architecture](#architecture)
4. [Data Model](#data-model)
5. [REST API](#rest-api)
6. [Personal Access Tokens](#personal-access-tokens)
7. [Claude Code Skill](#claude-code-skill)
8. [Data Migration](#data-migration)
9. [Implementation Phases](#implementation-phases)
10. [Success Metrics](#success-metrics)
11. [Security Considerations](#security-considerations)
12. [Future Enhancements](#future-enhancements)

---

## Overview

This document defines the plan for migrating SpecFlux from a local-only desktop application to a cloud-enabled platform with Claude Code skill integration for AI-assisted project management.

**Current State:** Node.js/Express backend with SQLite, runs locally via Tauri desktop app.

**Target State:** Spring Boot backend with PostgreSQL on cloud, Claude Code skill for AI integration, desktop app connects to cloud API.

## Goals

1. **Cloud Backend** - Migrate REST API to Spring Boot with PostgreSQL for multi-user support
2. **Seamless AI Integration** - Claude Code skill enables project management through natural conversation
3. **PRD-to-Tasks Workflow** - AI can analyze PRDs and generate structured epic/task breakdowns
4. **Predictable Behavior** - Skill provides explicit API patterns for consistent, reliable operations
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
         │ REST API                             │ REST API
         │ (Firebase Token)                     │ (Personal Access Token)
         ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Spring Boot Backend (Cloud)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  REST API    │  │  Services    │  │  Auth        │          │
│  │  Controllers │  │  (Business)  │  │  (Firebase   │          │
│  │              │  │              │  │   + PAT)     │          │
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

### Authentication

Two authentication methods supported:

| Method | Use Case | Token Format |
|--------|----------|--------------|
| **Firebase JWT** | Desktop app, web UI | `Authorization: Bearer <firebase_token>` |
| **Personal Access Token** | Claude Code, API scripts | `Authorization: Bearer sfx_<token>` |

### Firebase Authentication

User authentication for interactive sessions via Firebase:

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
| `personal_access_tokens` | PAT for API access |

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

### Token Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tokens` | List user's tokens (metadata only) |
| POST | `/api/tokens` | Create new token (returns token once) |
| DELETE | `/api/tokens/{id}` | Revoke token |

## Personal Access Tokens

Personal Access Tokens (PAT) provide long-lived API access for Claude Code and automation scripts.

### Token Format

```
sfx_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
└─┬─┘└┬─┘└──────────────┬──────────────┘
  │   │                 │
prefix env           random (32+ chars)
```

- **Prefix:** `sfx_` identifies SpecFlux tokens
- **Environment:** `live_` for production, `test_` for development
- **Random:** Cryptographically secure random string

### Token Storage

| Field | Description |
|-------|-------------|
| `id` | Internal ID |
| `user_id` | Owner of the token |
| `token_hash` | SHA-256 hash (token never stored in plain text) |
| `token_prefix` | First 8 chars for display (e.g., `sfx_live`) |
| `token_suffix` | Last 4 chars for identification (e.g., `o5p6`) |
| `name` | User-provided description (e.g., "Claude Code on MacBook") |
| `expires_at` | Expiration timestamp (NULL = never) |
| `last_used_at` | Timestamp of last API call |
| `last_used_ip` | IP address of last use (for security audit) |
| `revoked_at` | Revocation timestamp (NULL = active) |
| `created_at` | Creation timestamp |

### Expiration Options

| Option | Duration | Use Case |
|--------|----------|----------|
| Never | NULL | Personal dev machines, long-term automation |
| 30 days | 30d | Short-term access, shared environments |
| 60 days | 60d | Medium-term projects |
| 90 days | 90d | Quarterly rotation policy |

### Token States

| State | Condition | API Response |
|-------|-----------|--------------|
| **Active** | `expires_at` NULL or future, `revoked_at` NULL | ✅ 200 OK |
| **Expired** | `expires_at` in past | ❌ 401 "Token expired" |
| **Revoked** | `revoked_at` set | ❌ 401 "Token revoked" |

### Token Generation Flow

1. User navigates to Settings → API Tokens
2. Clicks "Generate New Token"
3. Enters token name (e.g., "Claude Code on MacBook")
4. Selects expiration (Never, 30d, 60d, 90d)
5. Token displayed **once** with copy button
6. Token list shows masked version: `sfx_live...o5p6`

### Token Usage

```bash
# Add to shell profile (~/.zshrc or ~/.bashrc)
export SPECFLUX_API_TOKEN="sfx_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"

# API calls automatically use the token
curl -H "Authorization: Bearer $SPECFLUX_API_TOKEN" \
     https://api.specflux.dev/api/projects
```

### Token List Display

Users see their tokens with masked values:

| Name | Token | Expires | Last Used |
|------|-------|---------|-----------|
| Claude Code MacBook | `sfx_live...o5p6` | Never | 2 hours ago |
| CI Pipeline | `sfx_live...x9y2` | in 25 days | 1 day ago |

### Token Lifecycle

1. **Creation** - User generates token in Settings UI, full token shown once
2. **Usage** - Token included in Authorization header, `last_used_at` updated
3. **Rotation** - User creates new token, revokes old one
4. **Revocation** - Token immediately invalidated, cannot be undone

## Claude Code Skill

Instead of an MCP server, SpecFlux uses a Claude Code skill for predictable, reliable project management.

### Why Skill over MCP?

| Aspect | MCP Server | Skill |
|--------|------------|-------|
| **Predictability** | Claude interprets when to use tools | Explicit patterns Claude follows |
| **Maintenance** | Separate server to deploy | Markdown file in repo |
| **Debugging** | Harder - separate process | Easy - read/edit skill file |
| **Distribution** | Requires MCP setup per user | Auto-loaded from repo |

### Skill Structure

```
.claude/skills/specflux-project-management/
├── skill.md              # Main instructions and capabilities
├── api-reference.md      # All endpoints with curl examples
├── workflows.md          # Common task sequences
└── examples.md           # Example conversations
```

### Skill Capabilities

| Capability | Description |
|------------|-------------|
| **Project Management** | List, create, update projects |
| **Epic Management** | CRUD operations on epics |
| **Task Management** | CRUD operations with dependencies |
| **PRD Breakdown** | Extract epics/tasks from PRD documents |
| **Task Refinement** | Generate acceptance criteria |
| **Epic Planning** | Break epics into ordered tasks |

### Skill Behavior

The skill instructs Claude to:
- Use `SPECFLUX_API_TOKEN` environment variable for authentication
- Reference entities by display keys (e.g., SPEC-42)
- Follow workflow order: project → epic → task → dependencies
- Always include acceptance criteria when creating tasks
- Suggest dependencies proactively
- Confirm operations with display keys in responses

### API Patterns in Skill

The skill provides explicit curl patterns:

```markdown
## Create Task

curl -X POST "$SPECFLUX_API_URL/api/projects/{project_key}/tasks" \
  -H "Authorization: Bearer $SPECFLUX_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Task title",
    "description": "Task description",
    "acceptance_criteria": ["Criterion 1", "Criterion 2"],
    "epic_id": 123
  }'
```

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

### Phase 3: Personal Access Token Support
- Implement PAT database schema and entity
- Add token generation endpoint
- Implement token authentication filter
- Add token management UI in desktop app
- Token revocation and expiration handling

### Phase 4: Cloud Deployment
- Provision Oracle Cloud ARM Compute Instance (free tier)
- Setup PostgreSQL database (Oracle Cloud or external)
- Configure reverse proxy (nginx) with SSL
- CI/CD pipeline for ARM builds (GitHub Actions with ARM runner or cross-compile)
- Environment configuration and secrets management
- Health monitoring and logging

### Phase 5: Desktop App Integration
- Update frontend API client to support cloud endpoint
- Add cloud/local mode toggle in settings
- Implement Firebase Auth flow (login, token management)
- Add PAT management UI (generate, list, revoke)
- Test all features against cloud backend

### Phase 6: Data Migration Tooling
- Build export command in desktop app
- Build import endpoint in cloud backend
- ID mapping and display key generation
- Migration validation and rollback support
- User documentation for migration process

### Phase 7: Claude Code Skill
- Create skill structure in `.claude/skills/`
- Write API reference with curl examples
- Document workflows (PRD breakdown, task refinement, epic planning)
- Add example conversations
- Test skill with Claude Code

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
| Skill Task Completion | > 95% success rate |
| PRD Breakdown Time | < 5 minutes |

## Security Considerations

| Area | Approach |
|------|----------|
| **Authentication** | Firebase Auth (JWT) + Personal Access Tokens |
| **Authorization** | Project membership checks via `project_members` |
| **Data Isolation** | Users only see projects they're members of |
| **API Security** | Rate limiting, input validation |
| **Token Security** | SHA-256 hashed, shown once on creation, revocable |

## Future Enhancements

1. **Team Collaboration** - Multiple users per project with roles
2. **Real-time Updates** - WebSocket notifications for task changes
3. **Token Scopes** - Read-only vs full access tokens
4. **Analytics Dashboard** - Project velocity, completion trends
5. **Integrations** - GitHub, Linear, Jira sync
