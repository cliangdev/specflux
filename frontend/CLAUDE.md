# Frontend - Tauri Desktop App

This file provides context for Claude Code when working in the frontend directory.

## Overview

The frontend is a Tauri desktop application built with:
- React 18 + TypeScript
- Vite for development/building
- TailwindCSS for styling
- Generated API client from OpenAPI spec

## Architecture

```
frontend/
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Root component with routing
│   ├── index.css           # TailwindCSS imports
│   ├── api/                # API client layer
│   │   ├── index.ts        # Barrel exports
│   │   ├── client.ts       # Configured API instances
│   │   └── generated/      # Auto-generated (gitignored)
│   ├── components/
│   │   ├── layout/         # App shell (Sidebar, TopBar)
│   │   └── ui/             # Reusable UI components
│   ├── pages/              # Route pages
│   │   ├── BoardPage.tsx
│   │   ├── TasksPage.tsx
│   │   ├── EpicsPage.tsx
│   │   ├── FilesPage.tsx
│   │   └── SettingsPage.tsx
│   ├── hooks/              # Custom React hooks
│   └── test/               # Test setup
├── src-tauri/              # Rust/Tauri code
│   ├── src/
│   │   └── main.rs         # Tauri entry point
│   ├── Cargo.toml
│   └── tauri.conf.json     # Tauri configuration
└── public/                 # Static assets
```

## Routing

Routes are defined in `App.tsx`:

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Redirect | Redirects to `/board` |
| `/board` | `BoardPage` | Kanban board view |
| `/tasks` | `TasksPage` | Task list/table view |
| `/epics` | `EpicsPage` | Epic management |
| `/files` | `FilesPage` | File browser |
| `/settings` | `SettingsPage` | Project settings |

## API Client

The API client is auto-generated from the backend's OpenAPI spec.

**Usage:**
```typescript
import { api, Project, Task } from '../api';

// List projects
const response = await api.projects.listProjects();

// Create task
const task = await api.tasks.createTask({
  projectId: 1,
  createTaskRequest: { title: 'New task', ... }
});
```

**Configuration:**
- Base URL: `http://localhost:3000/api` (or `VITE_API_BASE_URL` env var)
- Auth: `X-User-Id` header automatically added
- Change user: `setUserId(userId)`

**Regenerating:**
```bash
npm run generate:api  # Runs orchestrator's generate:client
```

## Styling

**TailwindCSS** is used for all styling.

**Conventions:**
- Use Tailwind utilities directly in JSX
- No custom CSS files per component
- Use `@apply` sparingly (only in `index.css` for base styles)

**Example:**
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Click me
</button>
```

## Commands

```bash
npm run dev          # Vite dev server (web only)
npm run build        # Production build
npm test             # Run Vitest tests
npm run lint         # ESLint check
npm run generate:api # Regenerate API client

# Tauri commands
npm run tauri:dev    # Full desktop app development
npm run tauri:build  # Production desktop build
```

## Component Patterns

**Functional Components Only:**
```tsx
interface Props {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: Props) {
  const [state, setState] = useState<string>('');

  return (
    <div className="p-4">
      <h1>{title}</h1>
      <button onClick={onAction}>Action</button>
    </div>
  );
}
```

**Custom Hooks for Data Fetching:**
```tsx
function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projects.listProjects()
      .then(res => setProjects(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return { projects, loading };
}
```

## Testing

- **Framework:** Vitest + Testing Library
- **Test files:** `*.test.tsx` alongside components
- **Run:** `npm test` or `npm run test:watch`

## Tauri Integration

For desktop-specific features (file dialogs, system tray, etc.):

```typescript
import { open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';

// File dialog
const selected = await open({ directory: true });

// Call Rust backend
const result = await invoke('my_command', { arg: 'value' });
```

**Note:** Tauri IPC is for desktop-only features. Most data flows through the REST API.
