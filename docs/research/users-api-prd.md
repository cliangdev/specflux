# Users API PRD

## Overview
Design a Users API that integrates with Firebase Authentication (GitHub OAuth), supports local development, and enables future team/member management.

## Current State
- `User` entity exists: `id`, `publicId`, `firebaseUid`, `email`, `displayName`, `avatarUrl`, `createdAt`, `updatedAt`
- `UserRepository` with `findByFirebaseUid`, `findByPublicId`, `findByEmail`
- No REST API endpoints
- Frontend uses dummy user for local development

## Goals
1. GitHub OAuth as primary login method (via Firebase)
2. Auto-provision users on first authentication
3. Provide `/me` endpoint for current user profile
4. Automatic token refresh to maintain sessions
5. Same auth flow in local dev (Firebase Emulator)
6. Prepare for future project membership

## Login Trigger
When an unauthenticated user attempts to create a project, the frontend should:
1. Intercept the action and show login prompt
2. Offer "Sign in with GitHub" button
3. After successful auth, continue with project creation

## API Endpoints

### Users (Tag: Users)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get current authenticated user profile |
| PUT | `/users/me` | Update current user profile (displayName, avatarUrl) |
| GET | `/users/{ref}` | Get user by publicId (for member lookup) |

### Request/Response Schemas

```yaml
User:
  type: object
  properties:
    publicId: { type: string, example: "usr_abc123" }
    email: { type: string }
    displayName: { type: string }
    avatarUrl: { type: string, nullable: true }
    createdAt: { type: string, format: date-time }

UpdateUserRequest:
  type: object
  properties:
    displayName: { type: string, minLength: 1, maxLength: 100 }
    avatarUrl: { type: string, nullable: true, maxLength: 500 }
```

## Authentication Flow

### GitHub OAuth via Firebase (Production)

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│ Frontend│     │ Firebase │     │  GitHub  │     │ Backend │
└────┬────┘     └────┬─────┘     └────┬─────┘     └────┬────┘
     │               │                │                │
     │ signInWithPopup(GithubProvider)│                │
     │──────────────>│                │                │
     │               │  OAuth redirect│                │
     │               │───────────────>│                │
     │               │                │                │
     │               │  Auth code     │                │
     │               │<───────────────│                │
     │               │                │                │
     │ Firebase credential (ID token) │                │
     │<──────────────│                │                │
     │               │                │                │
     │ API request with Bearer token  │                │
     │────────────────────────────────────────────────>│
     │               │                │                │
     │               │                │  Validate token│
     │               │<───────────────────────────────│
     │               │                │                │
     │ User data + auto-provision     │                │
     │<────────────────────────────────────────────────│
```

**Frontend Implementation:**
```typescript
import { signInWithPopup, GithubAuthProvider } from 'firebase/auth';

const loginWithGitHub = async () => {
  const provider = new GithubAuthProvider();
  provider.addScope('read:user');
  provider.addScope('user:email');

  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();

  // Store token for API calls
  localStorage.setItem('authToken', idToken);

  // Fetch user profile
  const user = await api.get('/users/me', {
    headers: { Authorization: `Bearer ${idToken}` }
  });

  return user;
};
```

### Token Architecture (Stay Logged In Forever)

Firebase uses two tokens:

| Token | Expiry | Purpose |
|-------|--------|---------|
| **ID Token** | 1 hour | Short-lived JWT sent to backend for auth |
| **Refresh Token** | ~30 days* | Long-lived token to get new ID tokens |

*Refresh tokens don't expire on a fixed schedule - they remain valid until:
- User explicitly signs out
- User changes password
- Admin revokes refresh tokens
- 30 days of inactivity (configurable in Firebase Console)

**For a desktop app, users stay logged in indefinitely** - Firebase SDK handles ID token refresh silently using the refresh token. No user interaction needed.

### Session Persistence (Survives App Restart)

```typescript
import { indexedDBLocalPersistence, setPersistence } from 'firebase/auth';

// Use IndexedDB for Tauri desktop app (more reliable than localStorage)
await setPersistence(auth, indexedDBLocalPersistence);
```

This persists both the refresh token and auth state. When the app restarts:
1. Firebase SDK loads auth state from IndexedDB
2. If ID token expired, SDK automatically uses refresh token to get a new one
3. User appears logged in immediately - no login prompt

### Lazy Token Refresh (Only When Needed)

Instead of refreshing tokens proactively, refresh only when making API calls:

```typescript
import { getIdToken } from 'firebase/auth';

// Get a valid token (refreshes automatically if expired)
const getAuthToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  // getIdToken() returns cached token if valid, or refreshes if expired
  // Set forceRefresh=false to minimize refresh calls
  return await getIdToken(user, false);
};

// API client with lazy token fetch
const apiClient = {
  async request(config: RequestConfig) {
    const token = await getAuthToken();
    if (token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }
    return fetch(config.url, config);
  }
};
```

**API Interceptor with Retry:**
```typescript
api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && auth.currentUser) {
      // Force refresh and retry once
      const newToken = await getIdToken(auth.currentUser, true);
      if (newToken) {
        error.config.headers['Authorization'] = `Bearer ${newToken}`;
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);
```

### When Users Must Re-Login

Users only see a login prompt when:
1. They click "Sign Out"
2. They change their password (revokes refresh token)
3. Admin disables their account
4. 30+ days of not opening the app (configurable)

### Local Development (Firebase Emulator)

Use Firebase Emulator to simulate the same auth flow as production:

**1. Start Firebase Emulator**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize (one-time)
firebase init emulators  # Select: Authentication

# Start emulator
firebase emulators:start --only auth
# Auth emulator runs at http://localhost:9099
```

**2. Backend Configuration** (`application-dev.yml`)
```yaml
firebase:
  emulator:
    enabled: true
    host: localhost:9099
```

**3. Frontend Configuration**
```typescript
import { connectAuthEmulator } from 'firebase/auth';

if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
}
```

**4. GitHub OAuth in Emulator**

The emulator intercepts OAuth calls and shows a test account picker - same code as production:

```typescript
// Same code works in both dev (emulator) and prod (real GitHub)
const loginWithGitHub = async () => {
  const provider = new GithubAuthProvider();
  provider.addScope('read:user');
  provider.addScope('user:email');

  // In emulator: shows test account picker
  // In prod: redirects to real GitHub OAuth
  const result = await signInWithPopup(auth, provider);
  return result.user;
};
```

When triggered in emulator, user sees a form to enter test account details (email, display name) instead of real GitHub OAuth.

**Benefits:**
- Identical code path as production
- Test actual OAuth + token flow
- No mock users or special dev branches

## Implementation Notes

### Auto-provisioning Logic
```java
// In FirebaseAuthenticationFilter or a UserService
User getOrCreateUser(FirebaseToken token) {
  return userRepository.findByFirebaseUid(token.getUid())
    .orElseGet(() -> {
      User user = new User(
        PublicId.generate("usr"),
        token.getUid(),
        token.getEmail(),
        token.getName() != null ? token.getName() : token.getEmail()
      );
      user.setAvatarUrl(token.getPicture());
      return userRepository.save(user);
    });
}
```

### Security Context
- Store user in `SecurityContextHolder` after authentication
- Access via `@AuthenticationPrincipal User user` in controllers

## Future: Project Membership (Phase 2)

```yaml
# Future endpoints for team management
POST   /projects/{ref}/members      # Invite member
GET    /projects/{ref}/members      # List project members
DELETE /projects/{ref}/members/{userRef}  # Remove member

ProjectMember:
  type: object
  properties:
    user: { $ref: '#/components/schemas/User' }
    role: { type: string, enum: [owner, admin, member, viewer] }
    joinedAt: { type: string, format: date-time }
```

## Success Criteria

### Backend
- [ ] `GET /users/me` returns current user profile
- [ ] `PUT /users/me` updates displayName/avatarUrl
- [ ] Users auto-provisioned on first Firebase auth
- [ ] Works with Firebase Emulator in dev (`firebase.emulator.enabled=true`)

### Frontend
- [ ] GitHub OAuth login via Firebase works
- [ ] Lazy token refresh on API calls (not proactive)
- [ ] 401 responses trigger force refresh + retry
- [ ] Session persists across app restarts (IndexedDB)
- [ ] Users stay logged in indefinitely (until explicit logout)
- [ ] Unauthenticated users prompted to login when creating project
- [ ] User profile displayed in header/sidebar after login
- [ ] Connects to Firebase Emulator in dev mode
