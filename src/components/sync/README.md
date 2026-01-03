# Sync Status Components

A collection of React components for displaying and managing Git sync status in SpecFlux.

## Components

### SyncStatusBadge

A small badge showing the current sync state with appropriate icon and color.

**Props:**
- `status`: `SyncStatus` - The current sync status
- `onClick?`: `() => void` - Optional click handler (renders as button when provided)
- `size?`: `"sm" | "md"` - Size variant (default: "sm")
- `showLabel?`: `boolean` - Whether to show text label (default: false)
- `className?`: `string` - Additional CSS classes

**Sync States:**
- `synced` - Up to date with remote (green)
- `pending_push` - Local commits not pushed (amber, pulsing)
- `pending_pull` - Remote has new commits (blue, pulsing)
- `conflict` - Diverged, needs resolution (red)
- `offline` - No internet, changes queued (gray)
- `local_only` - No GitHub connection (gray)

**Example:**
```tsx
import { SyncStatusBadge } from "@/components/sync";

// Simple badge
<SyncStatusBadge status="synced" />

// With label and click handler
<SyncStatusBadge
  status="pending_push"
  showLabel
  onClick={() => console.log("Clicked")}
/>
```

---

### SyncStatusPanel

Detailed panel showing sync status with description, metadata, and actions.

**Props:**
- `status`: `SyncStatus` - The current sync status
- `lastSyncedAt?`: `Date` - Last sync timestamp
- `pendingChanges?`: `number` - Number of pending file changes
- `githubUrl?`: `string` - GitHub repository URL
- `onSync?`: `() => Promise<void>` - Sync action handler
- `onOpenConflictResolution?`: `() => void` - Open conflict resolution handler
- `className?`: `string` - Additional CSS classes

**Example:**
```tsx
import { SyncStatusPanel } from "@/components/sync";

<SyncStatusPanel
  status="pending_push"
  lastSyncedAt={new Date(Date.now() - 5 * 60000)}
  pendingChanges={3}
  githubUrl="https://github.com/owner/repo"
  onSync={async () => {
    // Sync logic
  }}
/>
```

---

### ConflictResolutionModal

Modal for resolving sync conflicts with file-by-file selection and resolution strategies.

**Props:**
- `conflictedFiles`: `ConflictFile[]` - Array of files with conflicts
- `onClose`: `() => void` - Close modal handler
- `onResolve`: `(strategy, files?) => Promise<void>` - Resolve conflicts handler

**ConflictFile Interface:**
```typescript
interface ConflictFile {
  path: string;
  hasLocalChanges: boolean;
  hasRemoteChanges: boolean;
}
```

**Resolution Strategies:**
- `keep_local` - Overwrite remote with local version
- `keep_remote` - Overwrite local with remote version
- `manual` - Open diff tool for manual merge

**Example:**
```tsx
import { ConflictResolutionModal } from "@/components/sync";

const [showModal, setShowModal] = useState(false);

<ConflictResolutionModal
  conflictedFiles={[
    { path: "src/file.ts", hasLocalChanges: true, hasRemoteChanges: true }
  ]}
  onClose={() => setShowModal(false)}
  onResolve={async (strategy, files) => {
    // Handle resolution
  }}
/>
```

---

### GitHubConnectCard

Card component for connecting a project to GitHub with validation and benefits.

**Props:**
- `onConnect`: `(githubUrl: string) => Promise<void>` - Connect handler
- `className?`: `string` - Additional CSS classes

**Supported URL Formats:**
- HTTPS: `https://github.com/owner/repo`
- SSH: `git@github.com:owner/repo.git`
- SSH Alias: `alias:owner/repo.git`

**Example:**
```tsx
import { GitHubConnectCard } from "@/components/sync";

<GitHubConnectCard
  onConnect={async (url) => {
    // Connect to GitHub
  }}
/>
```

---

## Hook

### useSyncStatus

React hook for monitoring git sync status with automatic polling.

**Options:**
- `repoPath?`: `string` - Path to git repository
- `pollInterval?`: `number` - Polling interval in ms (default: 30000)
- `pollOnWindowFocus?`: `boolean` - Poll when window gains focus (default: true)

**Returns:**
- `syncData`: `SyncStatusData` - Current sync status and metadata
- `isLoading`: `boolean` - Loading state
- `error`: `string | null` - Error message if any
- `refresh`: `() => Promise<void>` - Manually refresh status
- `sync`: `() => Promise<void>` - Smart sync (push or pull based on status)
- `push`: `() => Promise<void>` - Push local commits
- `pull`: `() => Promise<void>` - Pull remote commits

**SyncStatusData Interface:**
```typescript
interface SyncStatusData {
  status: SyncStatus;
  lastSyncedAt?: Date;
  pendingChanges: number;
  githubUrl?: string;
  branch?: string;
}
```

**Example:**
```tsx
import { useSyncStatus } from "@/hooks/useSyncStatus";

function MyComponent() {
  const { syncData, isLoading, sync, refresh } = useSyncStatus({
    repoPath: "/path/to/repo",
    pollInterval: 30000,
  });

  return (
    <div>
      <SyncStatusBadge status={syncData.status} showLabel />
      <button onClick={sync}>Sync Now</button>
    </div>
  );
}
```

---

## Integration Example

Here's how to add sync status to a project detail page:

```tsx
import { useState } from "react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import {
  SyncStatusBadge,
  SyncStatusPanel,
  ConflictResolutionModal
} from "@/components/sync";

function ProjectDetailPage() {
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);

  const { syncData, sync, refresh } = useSyncStatus({
    repoPath: "/path/to/project",
  });

  return (
    <div>
      {/* In header */}
      <div className="flex items-center gap-3">
        <h1>Project Name</h1>
        <SyncStatusBadge
          status={syncData.status}
          onClick={() => setShowSyncPanel(true)}
        />
      </div>

      {/* Sync panel (sidebar or modal) */}
      {showSyncPanel && (
        <SyncStatusPanel
          status={syncData.status}
          lastSyncedAt={syncData.lastSyncedAt}
          pendingChanges={syncData.pendingChanges}
          githubUrl={syncData.githubUrl}
          onSync={sync}
          onOpenConflictResolution={() => setShowConflictModal(true)}
        />
      )}

      {/* Conflict resolution */}
      {showConflictModal && (
        <ConflictResolutionModal
          conflictedFiles={/* Get from git */}
          onClose={() => setShowConflictModal(false)}
          onResolve={async (strategy, files) => {
            // Handle resolution
            await refresh();
          }}
        />
      )}
    </div>
  );
}
```

---

## Styling

All components follow the SpecFlux UI patterns:

- **Dark mode support**: All components have `dark:` variants
- **Semantic colors**:
  - Green (emerald) for success/synced
  - Amber for warnings/pending
  - Red for errors/conflicts
  - Blue (accent) for info/pull pending
  - Gray (surface) for neutral states
- **Component classes**: Uses `.btn`, `.input`, `.card` from global styles
- **Responsive**: Components adapt to container width

---

## Testing

All components have comprehensive test coverage. Run tests with:

```bash
npm test -- src/components/sync/__tests__
```

Test files:
- `SyncStatusBadge.test.tsx` - Badge rendering, states, interactions
- `SyncStatusPanel.test.tsx` - Panel metadata, actions, states
- `ConflictResolutionModal.test.tsx` - File selection, strategies, resolution
- `GitHubConnectCard.test.tsx` - URL validation, connection flow

---

## Dependencies

- `@tauri-apps/plugin-shell` - For git command execution
- `react` - UI framework
- `tailwindcss` - Styling

---

## Future Enhancements

Potential improvements:
- Real-time sync status via WebSocket
- Merge conflict preview/diff viewer
- Branch switching UI
- Commit history viewer
- Push/pull progress indicators
