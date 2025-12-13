---
name: typescript-patterns
description: TypeScript best practices. Use when writing TypeScript code for backend services, API handlers, or shared utilities. Applies async/await patterns, typed errors, and strict type safety.
---

# TypeScript Best Practices

## Patterns We Use

### Async/Await Pattern
Always use async/await, never callbacks or .then():

```typescript
// Good
async function createTask(data: CreateTaskRequest): Promise<Task> {
  const task = await db.insert(tasks).values(data).returning();
  return task[0];
}

// Bad
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
// Good
interface CreateTaskRequest {
  title: string;
  description?: string;
  epic_id?: number;
}

// Bad
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
