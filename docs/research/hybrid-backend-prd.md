# Hybrid Backend Migration PRD

## Overview

Refactor the SpecFlux frontend to support both v1 (Node.js/SQLite) and v2 (Spring Boot/PostgreSQL) backends simultaneously.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Components                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   API Router Layer                               │
│  - Routes requests to v1 or v2 based on endpoint type           │
│  - Manages auth state (Firebase for v2, X-User-Id for v1)       │
└────────┬─────────────────────────────────┬──────────────────────┘
         │                                 │
┌────────▼────────┐               ┌────────▼────────┐
│   v1 API Client │               │   v2 API Client │
│  (Node.js)      │               │  (Spring Boot)  │
│  localhost:3000 │               │  localhost:8090 │
└────────┬────────┘               └────────┬────────┘
         │                                 │
┌────────▼────────┐               ┌────────▼────────┐
│  SQLite (local) │               │  PostgreSQL     │
│  - agents       │               │  - projects     │
│  - skills       │               │  - epics        │
│  - mcp_servers  │               │  - tasks        │
│  - files        │               │  - releases     │
│  - notifications│               │  - users        │
└─────────────────┘               └─────────────────┘
```

## API Routing Strategy

| Domain | Backend | Rationale |
|--------|---------|-----------|
| Projects | v2 | Cloud-synced |
| Epics | v2 | Cloud-synced |
| Tasks | v2 | Cloud-synced |
| Releases | v2 | Cloud-synced |
| Users | v2 | Firebase auth |
| Agents | v1 | Local process management |
| Skills | v1 | Local filesystem |
| MCP Servers | v1 | Local configuration |
| Files | v1 | Local filesystem browsing |
| Repositories | v1 | Local git operations |
| Notifications | v1 | Local-only |
| Health | v1 | Local orchestrator status |

## Response Format Differences

| Aspect | v1 Format | v2 Format |
|--------|-----------|-----------|
| Success | `{ success: true, data: T }` | `T` (direct) |
| Error | `{ success: false, error: string }` | `{ error, code, details }` |
| IDs | Integer (1, 2, 3) | String (`proj_xxx`) |
| Timestamps | ISO 8601 | ISO 8601 |
| Pagination | `page, limit` | `cursor, limit` |

## Authentication

- **v1:** `X-User-Id` header (simple integer)
- **v2:** Firebase JWT Bearer token (GitHub OAuth)

## Migration Flow

1. User clicks "Enable Cloud Backend" in Settings
2. User signs in with GitHub (Firebase Emulator in dev)
3. Backend auto-creates user via `GET /users/me`
4. Migration service transfers SQLite data to PostgreSQL
5. Toggle switches to v2 for cloud domains

## Implementation Tasks

### Phase 1: Firebase Auth Integration
- Task #171: Add Firebase SDK to frontend
- Task #172: Create AuthContext with GitHub OAuth flow

### Phase 2: v2 API Client
- Task #173: Generate v2 API client from Spring Boot OpenAPI
- Task #174: Create v2 API client configuration

### Phase 3: API Router Layer
- Task #175: Create backend settings store
- Task #176: Create API router layer
- Task #177: Create response adapter layer
- Task #180: Update api/index.ts to use router

### Phase 4: Settings UI
- Task #179: Add backend settings UI

### Phase 5: Data Migration
- Task #178: Create data migration service

### Phase 6: Cleanup
- Task #181: Add environment variables for v2 backend

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/firebase.ts` | Firebase SDK config with emulator support |
| `src/contexts/AuthContext.tsx` | Auth state, GitHub OAuth, token management |
| `src/api/v2/client.ts` | v2 API client configuration |
| `src/api/v2/generated/` | Auto-generated TypeScript client |
| `src/api/router.ts` | Routes requests to v1 or v2 |
| `src/api/adapters/v2Adapter.ts` | Response format conversion |
| `src/stores/backendStore.ts` | Backend settings persistence |
| `src/services/migrationService.ts` | Data migration logic |
| `src/components/settings/BackendSettings.tsx` | Settings UI |

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add firebase, generate:client:v2 script |
| `src/api/index.ts` | Re-export from router |
| `src/pages/SettingsPage.tsx` | Add backend section |
| `.env.example` | Add VITE_V2_API_BASE_URL |

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000/api        # v1
VITE_V2_API_BASE_URL=http://localhost:8090/api     # v2
VITE_FIREBASE_EMULATOR=true
```

## Testing Strategy

1. Unit tests for API router and response adapters
2. Integration tests with Firebase Emulator
3. Manual testing of auth flow and migration
