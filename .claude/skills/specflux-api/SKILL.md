---
name: specflux-api
description: SpecFlux REST API for creating and managing projects, PRDs, epics, tasks, and acceptance criteria. Use when running /prd, /epic, /task, or /implement commands to create or update entities in SpecFlux via HTTP API. Use when creating PRDs, epics with tasks, adding acceptance criteria, updating task status, or marking criteria as complete.
---

# SpecFlux API

Create and manage SpecFlux entities via REST API at `http://localhost:8090/api`.

## Authentication

Include Firebase JWT token in all requests:
```
Authorization: Bearer <firebase-id-token>
```

### Get Test Token (Local Development)

For local development, get a token from the Firebase emulator:
```bash
curl -s 'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"email": "dev@specflux.local", "password": "devpass123", "returnSecureToken": true}' \
  | jq -r '.idToken'
```

Use the returned `idToken` as the Bearer token for API calls.

## Core Workflows

### Create PRD with Documents

```bash
# 1. Create PRD
POST /api/projects/{projectRef}/prds
{"title": "Authentication System", "description": "User auth with OAuth"}
# Returns: {"id": "prd_xxx", "displayKey": "PROJ-P1", "folderPath": ".specflux/prds/authentication-system", ...}

# 2. Add document to PRD
POST /api/projects/{projectRef}/prds/{prdRef}/documents
{"fileName": "prd.md", "filePath": ".specflux/prds/authentication-system/prd.md", "documentType": "PRD", "isPrimary": true}

# 3. Add supporting documents
POST /api/projects/{projectRef}/prds/{prdRef}/documents
{"fileName": "wireframe.png", "filePath": ".specflux/prds/authentication-system/wireframe.png", "documentType": "WIREFRAME"}

# 4. Update PRD status
PUT /api/projects/{projectRef}/prds/{prdRef}
{"status": "APPROVED"}
```

### Create Epic with Tasks

```bash
# 1. Create epic (linked to PRD)
POST /api/projects/{projectRef}/epics
{"title": "User Authentication", "description": "...", "prdRef": "PROJ-P1"}
# Returns: {"id": "epic_xxx", "displayKey": "PROJ-E1", "prdId": "prd_xxx", ...}

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
- **prdRef**: `prd_xxx` or display key like `SPEC-P1`
- **epicRef**: `epic_xxx` or display key like `SPEC-E1`
- **taskRef**: `task_xxx` or display key like `SPEC-42`

## Enums

**PrdStatus**: `DRAFT`, `IN_REVIEW`, `APPROVED`, `ARCHIVED`

**PrdDocumentType**: `PRD`, `WIREFRAME`, `MOCKUP`, `DESIGN`, `OTHER`

**EpicStatus**: `PLANNING`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`

**TaskStatus**: `BACKLOG`, `READY`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `COMPLETED`, `CANCELLED`

**TaskPriority**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

## Detailed Reference

See [references/api.md](references/api.md) for complete endpoint documentation with request/response schemas.
