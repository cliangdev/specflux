---
name: specflux-api
description: SpecFlux REST API for creating and managing projects, epics, tasks, and acceptance criteria. Use when running /epic, /task, or /implement commands to create or update entities in SpecFlux via HTTP API. Use when creating epics with tasks, adding acceptance criteria, updating task status, or marking criteria as complete.
---

# SpecFlux API

Create and manage SpecFlux entities via REST API at `http://localhost:8090/api`.

## Authentication

Include Firebase JWT token in all requests:
```
Authorization: Bearer <firebase-id-token>
```

## Core Workflows

### Create Epic with Tasks

```bash
# 1. Create epic
POST /api/projects/{projectRef}/epics
{"title": "User Authentication", "description": "...", "prdFilePath": ".specflux/prds/vision/prd.md"}
# Returns: {"id": "epic_xxx", "displayKey": "PROJ-E1", ...}

# 2. Add acceptance criteria
POST /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
{"criteria": "Users can sign up with email/password"}

# 3. Create tasks
POST /api/projects/{projectRef}/tasks
{"epicRef": "epic_xxx", "title": "Database schema", "priority": "HIGH"}
# Returns: {"id": "task_xxx", "displayKey": "PROJ-42", ...}

# 4. Add task criteria
POST /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
{"criteria": "User table with id, email, password_hash, created_at"}

# 5. Add dependencies
POST /api/projects/{projectRef}/tasks/{taskRef}/dependencies
{"dependsOnTaskRef": "PROJ-41"}
```

### Update Progress

```bash
# Mark criterion complete
PUT /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}
{"isMet": true}

# Update task status
PATCH /api/projects/{projectRef}/tasks/{taskRef}
{"status": "COMPLETED"}

# Update epic status
PUT /api/projects/{projectRef}/epics/{epicRef}
{"status": "IN_PROGRESS"}
```

### Read Entities

```bash
# Get task with criteria
GET /api/projects/{projectRef}/tasks/{taskRef}
GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria

# Get epic with tasks
GET /api/projects/{projectRef}/epics/{epicRef}
GET /api/projects/{projectRef}/tasks?epicRef={epicRef}
```

## Reference IDs

- **projectRef**: `proj_xxx` or project key like `SPEC`
- **epicRef**: `epic_xxx` or display key like `SPEC-E1`
- **taskRef**: `task_xxx` or display key like `SPEC-42`

## Enums

**TaskStatus**: `BACKLOG`, `READY`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `COMPLETED`, `CANCELLED`

**TaskPriority**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

**EpicStatus**: `PLANNING`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`

## Detailed Reference

See [references/api.md](references/api.md) for complete endpoint documentation with request/response schemas.
