# SpecFlux API Reference

Complete endpoint documentation for the SpecFlux REST API.

## Table of Contents

- [Projects](#projects)
- [PRDs](#prds)
- [Epics](#epics)
- [Tasks](#tasks)
- [Acceptance Criteria](#acceptance-criteria)
- [Task Dependencies](#task-dependencies)
- [Response Schemas](#response-schemas)

---

## Projects

### List Projects
```
GET /api/projects
```

Query params: `cursor`, `limit`, `sort`, `order`

### Create Project
```
POST /api/projects
```
```json
{
  "projectKey": "SPEC",      // required, 2-10 chars, uppercase
  "name": "My Project",      // required
  "description": "...",      // optional
  "localPath": "/path/to/project"  // optional
}
```

### Get Project
```
GET /api/projects/{ref}
```

### Update Project
```
PUT /api/projects/{ref}
```
```json
{
  "name": "Updated Name",
  "description": "...",
  "localPath": "/new/path"
}
```

### Delete Project
```
DELETE /api/projects/{ref}
```

---

## PRDs

### List PRDs
```
GET /api/projects/{projectRef}/prds
```

Query params: `cursor`, `limit`, `sort`, `order`, `status`

### Create PRD
```
POST /api/projects/{projectRef}/prds
```
```json
{
  "title": "Authentication System",   // required
  "description": "User auth with OAuth",
  "folderPath": ".specflux/prds/auth"  // optional, auto-generated from title
}
```

Response:
```json
{
  "id": "prd_xyz789",
  "displayKey": "SPEC-P1",
  "projectId": "proj_abc",
  "title": "Authentication System",
  "folderPath": ".specflux/prds/authentication-system",
  "status": "DRAFT",
  "documents": [],
  "documentCount": 0,
  "createdById": "user_xxx",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### Get PRD
```
GET /api/projects/{projectRef}/prds/{prdRef}
```

Returns PRD with embedded documents array.

### Update PRD
```
PUT /api/projects/{projectRef}/prds/{prdRef}
```
```json
{
  "title": "Updated Title",
  "description": "...",
  "status": "APPROVED"
}
```

### Delete PRD
```
DELETE /api/projects/{projectRef}/prds/{prdRef}
```

### Add Document to PRD
```
POST /api/projects/{projectRef}/prds/{prdRef}/documents
```
```json
{
  "fileName": "prd.md",           // required
  "filePath": ".specflux/prds/auth/prd.md",  // required
  "documentType": "PRD",          // PRD, WIREFRAME, MOCKUP, DESIGN, OTHER
  "isPrimary": true,              // optional, defaults to false
  "orderIndex": 0                 // optional, auto-incremented
}
```

### Update Document
```
PUT /api/projects/{projectRef}/prds/{prdRef}/documents/{docId}
```
```json
{
  "documentType": "WIREFRAME",
  "isPrimary": false,
  "orderIndex": 1
}
```

### Delete Document
```
DELETE /api/projects/{projectRef}/prds/{prdRef}/documents/{docId}
```

---

## Epics

### List Epics
```
GET /api/projects/{projectRef}/epics
```

Query params: `cursor`, `limit`, `sort`, `order`, `status`

### Create Epic
```
POST /api/projects/{projectRef}/epics
```
```json
{
  "title": "User Authentication",   // required
  "description": "Implement login and registration",
  "targetDate": "2024-03-01",
  "releaseRef": "rel_xxx",
  "prdRef": "SPEC-P1",              // PRD publicId or displayKey
  "acceptanceCriteria": [           // required, array of objects
    {"criteria": "Users can sign up with email/password"},
    {"criteria": "Users can log in with existing credentials"}
  ]
}
```

**Important:** `acceptanceCriteria` is required when creating an epic. Each item must be an object with a `criteria` property - NOT a plain string.

Response:
```json
{
  "id": "epic_xyz789",
  "displayKey": "SPEC-E1",
  "projectId": "proj_abc",
  "prdId": "prd_abc123",
  "title": "User Authentication",
  "status": "PLANNING",
  "phase": 1,
  "taskStats": {"total": 0, "done": 0, "inProgress": 0, "backlog": 0},
  "progressPercentage": 0,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### Get Epic
```
GET /api/projects/{projectRef}/epics/{epicRef}
```

### Update Epic
```
PUT /api/projects/{projectRef}/epics/{epicRef}
```
```json
{
  "title": "Updated Title",
  "description": "...",
  "status": "IN_PROGRESS",
  "targetDate": "2024-03-15",
  "prdRef": "SPEC-P1"
}
```

### Delete Epic
```
DELETE /api/projects/{projectRef}/epics/{epicRef}
```

---

## Tasks

### List Tasks
```
GET /api/projects/{projectRef}/tasks
```

Query params: `cursor`, `limit`, `sort`, `order`, `status`, `priority`, `epicRef`, `assignedToRef`, `search`

### Create Task
```
POST /api/projects/{projectRef}/tasks
```
```json
{
  "title": "Create user table",         // required
  "epicRef": "epic_xxx",                 // optional, links to epic
  "description": "Schema with auth fields",
  "priority": "HIGH",                    // LOW, MEDIUM, HIGH, CRITICAL
  "requiresApproval": true,
  "estimatedDuration": 120,              // minutes
  "assignedToRef": "user_xxx"
}
```

Response:
```json
{
  "id": "task_def456",
  "displayKey": "SPEC-42",
  "projectId": "proj_abc",
  "epicId": "epic_xyz",
  "epicDisplayKey": "SPEC-E1",
  "title": "Create user table",
  "status": "BACKLOG",
  "priority": "HIGH",
  "requiresApproval": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### Get Task
```
GET /api/projects/{projectRef}/tasks/{taskRef}
```

### Update Task
```
PATCH /api/projects/{projectRef}/tasks/{taskRef}
```
```json
{
  "title": "Updated title",
  "description": "...",
  "status": "IN_PROGRESS",
  "priority": "CRITICAL",
  "epicRef": "epic_xxx",
  "estimatedDuration": 180,
  "actualDuration": 150,
  "githubPrUrl": "https://github.com/...",
  "assignedToRef": "user_xxx"
}
```

### Delete Task
```
DELETE /api/projects/{projectRef}/tasks/{taskRef}
```

---

## Acceptance Criteria

### Epic Acceptance Criteria

#### List
```
GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
```

#### Create
```
POST /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
```
```json
{
  "criteria": "Users can sign up with email/password",
  "orderIndex": 1  // optional, auto-increments if not provided
}
```

Response:
```json
{
  "id": 1,
  "criteria": "Users can sign up with email/password",
  "isMet": false,
  "orderIndex": 1,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### Update
```
PUT /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{id}
```
```json
{
  "criteria": "Updated text",
  "isMet": true,
  "orderIndex": 2
}
```

#### Delete
```
DELETE /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria/{id}
```

### Task Acceptance Criteria

Same endpoints, replace `/epics/{epicRef}` with `/tasks/{taskRef}`:

```
GET    /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
POST   /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
PUT    /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}
DELETE /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}
```

---

## Task Dependencies

### List Dependencies
```
GET /api/projects/{projectRef}/tasks/{taskRef}/dependencies
```

Response:
```json
{
  "data": [
    {
      "taskId": "task_xxx",
      "dependsOnTaskId": "task_yyy",
      "dependsOnDisplayKey": "SPEC-41",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Add Dependency
```
POST /api/projects/{projectRef}/tasks/{taskRef}/dependencies
```
```json
{
  "dependsOnTaskRef": "SPEC-41"  // task reference (publicId or displayKey)
}
```

### Remove Dependency
```
DELETE /api/projects/{projectRef}/tasks/{taskRef}/dependencies/{dependsOnTaskRef}
```

---

## Response Schemas

### Pagination
All list endpoints return:
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "...",
    "prevCursor": "...",
    "hasMore": true,
    "total": 42
  }
}
```

### Error Response
```json
{
  "code": "NOT_FOUND",
  "message": "Epic not found"
}
```

### Status Enums

**PrdStatus**: `DRAFT`, `IN_REVIEW`, `APPROVED`, `ARCHIVED`

**PrdDocumentType**: `PRD`, `WIREFRAME`, `MOCKUP`, `DESIGN`, `OTHER`

**EpicStatus**: `PLANNING`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`

**TaskStatus**: `BACKLOG`, `READY`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `COMPLETED`, `CANCELLED`

**TaskPriority**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
