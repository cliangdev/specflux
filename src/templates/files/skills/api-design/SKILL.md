---
name: api-design
description: REST API design patterns. Use when creating new API endpoints, designing request/response schemas, implementing pagination, or updating OpenAPI specifications.
---

# API Design Patterns

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

API specs are organized in `openapi/`:

### Workflow
1. Update the relevant domain spec
2. Add request/response schemas to `components/`
3. Generate TypeScript client: `npm run generate:client`
4. Implement backend handler
5. Use generated types in frontend
