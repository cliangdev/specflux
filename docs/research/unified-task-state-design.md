# Unified Task State Design

**Status:** Proposal
**Date:** November 2024

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Task State File Format](#2-task-state-file-format)
3. [Examples by Use Case](#3-examples-by-use-case)
4. [Agent Session Protocol](#4-agent-session-protocol)
5. [File Size Management](#5-file-size-management)
6. [Token Optimization](#6-token-optimization)
7. [Implementation Guide](#7-implementation-guide)
8. [Appendix: Background & Comparisons](#appendix-background--comparisons)

---

## 1. Architecture Overview

### Core Concept

One file per task that evolves through its lifecycle, enabling session continuity and task handoffs.

```mermaid
flowchart TB
    subgraph "Task Lifecycle"
        direction LR
        CREATE[SpecFlux creates task] --> SESSION[Agent sessions]
        SESSION --> COMPLETE[Task complete]
    end

    subgraph "Task State File"
        direction TB
        META[Metadata]
        CTX[Context<br/>Task + Epic reference]
        CHAIN_IN[Chain Inputs<br/>Only if has dependencies]
        CHECKLIST[Feature Checklist]
        PROGRESS[Progress Log<br/>Updated each session]
        CHAIN_OUT[Chain Output<br/>Finalized when complete]
    end

    CREATE --> META
    SESSION --> PROGRESS
    COMPLETE --> CHAIN_OUT

    style PROGRESS fill:#E8F5E9
    style CHAIN_OUT fill:#F3E5F5
```

### Key Principles

| Principle | Description |
|-----------|-------------|
| **One file per task** | All state in `task-{id}-state.md` |
| **Minimal context** | Only include what agent needs |
| **Chain inputs only when needed** | Tasks without dependencies skip this section |
| **Progress log is critical** | Enables session continuity across context resets |
| **Size-aware** | Auto-archive when file exceeds 75 KB |

### File Structure

```
.specflux/
├── task-states/
│   ├── task-101-state.md     # Working files (< 75 KB each)
│   ├── task-102-state.md
│   └── task-103-state.md
└── archives/
    └── task-101-archive.md    # Full history if archived
```

---

## 2. Task State File Format

### Sections Overview

| Section | Required | When to Include |
|---------|----------|-----------------|
| **0. Metadata** | Yes | Always |
| **1. Context** | Yes | Always (but minimal) |
| **2. Chain Inputs** | No | Only if task has dependencies |
| **3. Feature Checklist** | Yes | Always |
| **4. Progress Log** | Yes | Agent updates each session |
| **5. Chain Output** | Yes | Agent finalizes when complete |

### Full Format Template

```markdown
# Task #{id}: {title}

## 0. Metadata
```json
{
  "task_id": 101,
  "epic_id": 10,
  "status": "in_progress",
  "created_at": "2024-11-26T14:00:00Z",
  "updated_at": "2024-11-26T16:00:00Z",
  "total_sessions": 3,
  "file_size_kb": 15
}
```

## 1. Context

**Epic:** {epic_title} (#{epic_id})
**Repository:** {repo_name}
**Agent:** {agent_name}

### Requirements
{brief task requirements - 2-5 sentences}

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## 2. Chain Inputs
(Only if this task depends on other tasks)

### From Task #{dep_id}: {dep_title}
> {summary of what upstream task produced}

## 3. Feature Checklist
```json
{
  "features": [
    { "id": "f1", "description": "Feature 1", "passes": false },
    { "id": "f2", "description": "Feature 2", "passes": true }
  ]
}
```

## 4. Progress Log

### Session 1 - {timestamp}
**Did:** {bullet points}
**Issues:** {any blockers}
**Next:** {clear next steps}

## 5. Chain Output
(Agent fills when task is complete)

### Summary
{what was built}

### For Downstream Tasks
{API contracts, integration notes}
```

---

## 3. Examples by Use Case

### Example A: Simple Task (No Dependencies)

A self-contained task with clear requirements. Most common case.

```markdown
# Task #201: Add dark mode toggle

## 0. Metadata
```json
{
  "task_id": 201,
  "epic_id": 15,
  "status": "in_progress",
  "total_sessions": 1,
  "file_size_kb": 8
}
```

## 1. Context

**Epic:** UI Polish (#15)
**Repository:** frontend
**Agent:** frontend-dev

### Requirements
Add a dark mode toggle to the settings page. Use existing theme context.
Follow the ui-patterns skill for styling.

### Acceptance Criteria
- [ ] Toggle switch in Settings > General
- [ ] Persists preference to localStorage
- [ ] Applies theme immediately without reload

## 3. Feature Checklist
```json
{
  "features": [
    { "id": "toggle-ui", "description": "Toggle component renders", "passes": false },
    { "id": "persist", "description": "Preference saved to localStorage", "passes": false },
    { "id": "apply", "description": "Theme applies immediately", "passes": false }
  ]
}
```

## 4. Progress Log

(No sessions yet)

## 5. Chain Output

(To be completed)
```

**Size: ~3 KB** - Simple, focused, no dependencies needed.

---

### Example B: Task with Dependencies

A task that builds on work from upstream tasks.

```markdown
# Task #102: Auth API endpoints

## 0. Metadata
```json
{
  "task_id": 102,
  "epic_id": 10,
  "status": "in_progress",
  "dependencies": [100, 101],
  "total_sessions": 2,
  "file_size_kb": 18
}
```

## 1. Context

**Epic:** User Authentication (#10)
**Repository:** backend
**Agent:** backend-dev

### Requirements
Create REST endpoints for login, logout, and token refresh.
Use the JWT service from Task #101.

### Acceptance Criteria
- [ ] POST /auth/login returns JWT on valid credentials
- [ ] POST /auth/logout invalidates refresh token
- [ ] POST /auth/refresh returns new access token
- [ ] All endpoints have input validation
- [ ] Integration tests pass

## 2. Chain Inputs

### From Task #100: Database Schema
> Users table: id mod(UUID), email (unique), password_hash, created_at

### From Task #101: JWT Service
> JWTService API:
> - `generateToken(userId: string): string`
> - `verifyToken(token: string): TokenPayload | null`
> - `refreshToken(oldToken: string): string`
>
> Config: JWT_SECRET, JWT_EXPIRY=15m

## 3. Feature Checklist
```json
{
  "features": [
    { "id": "login", "description": "POST /auth/login works", "passes": true },
    { "id": "logout", "description": "POST /auth/logout works", "passes": false },
    { "id": "refresh", "description": "POST /auth/refresh works", "passes": false },
    { "id": "validation", "description": "Input validation on all endpoints", "passes": false },
    { "id": "tests", "description": "Integration tests pass", "passes": false }
  ]
}
```

## 4. Progress Log

### Session 1 - 2024-11-26 14:00
**Did:**
- Created auth.routes.ts with login endpoint
- Integrated JWTService from Task #101
- Login works with valid credentials

**Issues:** None

**Next:** Implement logout and refresh endpoints

### Session 2 - 2024-11-26 15:30
**Did:**
- Added logout endpoint with token blacklist
- Started refresh endpoint

**Issues:** Need to handle concurrent refresh requests

**Next:** Fix race condition, add validation, write tests

## 5. Chain Output

(To be completed)
```

**Size: ~12 KB** - Includes chain inputs because this task depends on #100 and #101.

---

### Example C: Task with Multi-Session Progress

A task that has been worked on across multiple sessions with archiving.

```markdown
# Task #101: JWT Service

## 0. Metadata
```json
{
  "task_id": 101,
  "epic_id": 10,
  "status": "complete",
  "total_sessions": 8,
  "archived_sessions": 3,
  "file_size_kb": 22,
  "archive_path": ".specflux/archives/task-101-archive.md"
}
```

## 1. Context

**Epic:** User Authentication (#10)
**Repository:** backend
**Agent:** backend-dev

### Requirements
Implement JWT token service for authentication.
Support access tokens (15min) and refresh tokens (7 days).

### Acceptance Criteria
- [x] generateToken() creates valid JWT
- [x] verifyToken() validates signature and expiry
- [x] refreshToken() rotates tokens securely
- [x] Unit tests with 90%+ coverage

## 3. Feature Checklist
```json
{
  "features": [
    { "id": "generate", "description": "generateToken works", "passes": true },
    { "id": "verify", "description": "verifyToken works", "passes": true },
    { "id": "refresh", "description": "refreshToken works", "passes": true },
    { "id": "tests", "description": "90%+ test coverage", "passes": true }
  ]
}
```

## 4. Progress Log

### Archived Summary (Sessions 1-3)
**Duration:** 2024-11-26 10:00 - 12:30
**Accomplishments:** Set up project, implemented generateToken, fixed TypeScript issues
**Commits:** abc123, def456, ghi789
[Full details: .specflux/archives/task-101-archive.md]

### Session 4 - 2024-11-26 13:00
**Did:** Implemented verifyToken with signature validation
**Issues:** None
**Next:** Add refresh token logic

### Session 5 - 2024-11-26 14:00
**Did:** Added refreshToken with rotation
**Issues:** None
**Next:** Write comprehensive tests

(Sessions 6-8 abbreviated for example)

## 5. Chain Output

### Summary
JWT authentication service with token generation, verification, and refresh.

### Files
- `src/auth/jwt.service.ts` - Main service
- `src/auth/jwt.service.test.ts` - Tests (94% coverage)

### API Contract
```typescript
class JWTService {
  generateToken(userId: string): string
  verifyToken(token: string): TokenPayload | null
  refreshToken(oldToken: string): string
}
```

### Configuration
```env
JWT_SECRET=min-32-char-secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### Integration Notes
- Import: `import { jwtService } from '../auth/jwt.service'`
- Returns null for invalid tokens (check before proceeding)
```

**Size: ~18 KB** - Has archived sessions, complete chain output.

---

### Example D: Minimal Task (Clear Requirements)

A bug fix or small change with very clear scope.

```markdown
# Task #305: Fix login button disabled state

## 0. Metadata
```json
{
  "task_id": 305,
  "epic_id": null,
  "status": "in_progress",
  "total_sessions": 1,
  "file_size_kb": 4
}
```

## 1. Context

**Repository:** frontend
**Agent:** frontend-dev

### Requirements
Login button stays disabled after form validation passes.
Fix: Check `isValid` state in button disabled prop.
File: `src/components/LoginForm.tsx` line ~45

### Acceptance Criteria
- [ ] Button enables when email and password are valid
- [ ] Button disables during submission

## 3. Feature Checklist
```json
{
  "features": [
    { "id": "fix", "description": "Button enables on valid input", "passes": false }
  ]
}
```

## 4. Progress Log

(No sessions yet)

## 5. Chain Output

(Small fix - minimal output needed)
```

**Size: ~2 KB** - Bug fix with pinpointed location, no dependencies.

---

## 4. Agent Session Protocol

### Startup Sequence (Every Session)

```mermaid
flowchart TD
    A[Session Start] --> B[Read task-state.md]
    B --> C[Check Progress Log]
    C --> D{First session?}
    D -->|Yes| E[Start fresh]
    D -->|No| F[Review previous work]
    F --> G[Identify next steps]
    E --> H[Check feature checklist]
    G --> H
    H --> I[Pick ONE feature]
    I --> J[Implement]
    J --> K[Test & verify]
    K --> L[Update checklist]
    L --> M[Append to Progress Log]
    M --> N{All features done?}
    N -->|Yes| O[Write Chain Output]
    N -->|No| P[End session]
```

### Protocol Instructions (Inject to Agent)

```markdown
## Session Protocol

### Phase 1: Orientation
1. Read task-state.md completely
2. Run `git status` to check state
3. Review feature checklist for incomplete items

### Phase 2: Implementation
4. Pick ONE incomplete feature
5. Read relevant source files first
6. Implement directly (don't suggest)
7. Write tests, verify they pass

### Phase 3: Handoff
8. Update feature checklist (passes: true/false)
9. Append to Progress Log:
   - What you did
   - Any issues
   - Next steps
10. If all features pass → write Chain Output
```

### Agent Behavior Rules

```markdown
## Rules

DO NOT suggest changes. IMPLEMENT them.
DO NOT add features beyond acceptance criteria.
DO NOT create abstractions for single-use code.
DO NOT assume file contents - read first.

DO update progress log before ending.
DO mark features as passes:true only after testing.
DO keep solutions simple and direct.
```

---

## 5. File Size Management

### Thresholds

| Size | Action |
|------|--------|
| < 50 KB | OK |
| 50-75 KB | Warning |
| > 75 KB | Auto-archive older sessions |
| > 20 sessions | Suggest task decomposition |

### Archiving Strategy

Keep last 5 sessions in full detail, summarize older ones:

```markdown
## 4. Progress Log

### Archived Summary (Sessions 1-5)
**Duration:** 2024-11-26 10:00 - 14:00
**Accomplishments:** Set up project, core implementation done
**Commits:** abc123, def456, ghi789
[Full details: .specflux/archives/task-101-archive.md]

### Session 6 - 2024-11-26 15:00
(Full detail)

### Session 7 - 2024-11-26 16:00
(Full detail - most recent)
```

### Task Sizing Guidelines

| Complexity | Sessions | Recommendation |
|------------|----------|----------------|
| Simple | 1-3 | Single task |
| Medium | 4-8 | Single task, ideal size |
| Large | 9-15 | Consider splitting |
| Very Large | 16+ | Must decompose |

---

## 6. Token Optimization

### Embed vs Link Strategy

Only embed what agent needs every session. Link rarely-accessed content.

| Content | Access Pattern | Strategy |
|---------|----------------|----------|
| Task requirements | Always needed | **Embed** |
| Acceptance criteria | Always needed | **Embed** |
| Chain input summaries | Usually needed | **Embed** |
| Full PRD | Sometimes | **Link** |
| Full Epic | Sometimes | **Link** |
| Archived sessions | Rarely | **Link** |

### Example: Hybrid Approach

```markdown
## 1. Context

**Epic:** User Auth (#10) [Full: /api/epics/10]
**PRD:** user-auth.md [Full: /api/prds/user-auth]

### Requirements (embedded)
JWT tokens with 15-min expiry. Use jsonwebtoken library.

## 2. Chain Inputs (embedded summaries)

### From Task #100: Database Schema
> Users table: id, email, password_hash

[Full output: /api/tasks/100/chain-output]
```

**Result:** ~20 KB embedded, full content available via links if needed.

---

## 7. Implementation Guide

### Task State Manager

```typescript
const SIZE_THRESHOLDS = {
  WARNING_KB: 50,
  AUTO_ARCHIVE_KB: 75,
  MAX_RECENT_SESSIONS: 5,
  WARN_TOTAL_SESSIONS: 20,
};

class TaskStateManager {
  async createTaskState(task: Task): Promise<void> {
    const content = this.generateInitialState(task);
    await writeFile(this.getStatePath(task.id), content);
  }

  async appendSession(taskId: number, session: Session): Promise<void> {
    const state = await this.readState(taskId);
    state.progressLog.push(session);

    if (this.getSizeKb(state) > SIZE_THRESHOLDS.AUTO_ARCHIVE_KB) {
      await this.archiveOldSessions(state);
    }

    await this.writeState(taskId, state);
  }

  async extractChainOutput(taskId: number): Promise<ChainOutput> {
    const state = await this.readState(taskId);
    return this.parseChainOutput(state);
  }
}
```

### SpecFlux Integration Points

```mermaid
sequenceDiagram
    participant UI as SpecFlux UI
    participant API as Backend API
    participant TSM as TaskStateManager
    participant Agent as Claude Agent

    UI->>API: Create Task
    API->>TSM: createTaskState()
    TSM-->>API: task-state.md created

    UI->>API: Start Task
    API->>Agent: Launch with state file path
    Agent->>TSM: Read state
    Agent->>Agent: Work
    Agent->>TSM: Update progress

    UI->>API: Complete Task
    API->>TSM: extractChainOutput()
    TSM-->>API: Chain output for downstream
```

---

## Appendix: Background & Comparisons

### References

- [Anthropic - Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Claude 4.x Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)

### Problem Statement

**Challenge 1: Inter-Task Context**
When tasks depend on each other, downstream tasks need upstream outputs.
**Solution:** Chain Outputs (SpecFlux already has this)

**Challenge 2: Intra-Task Context**
When a task spans multiple sessions, agent loses memory on context reset.
**Solution:** Progress Log (this design adds this)

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Session continuity | Lost on reset | Preserved in Progress Log |
| Upstream context | Injected at start | Chain Inputs section |
| Downstream handoff | Separate file | Chain Output section |
| File count per task | Multiple | One unified file |

### Claude 4 Alignment

| Claude 4 Recommendation | Our Implementation |
|-------------------------|-------------------|
| Structured state tracking | JSON metadata + feature checklist |
| Save progress before reset | Progress Log section |
| Explicit action directives | Agent rules: "IMPLEMENT, don't suggest" |
| Read before edit | Protocol: "Read files first" |
| Verification tools | Feature checklist with passes: true/false |

### Why Not Just Link Everything?

Linking doesn't save tokens if agent needs the content:

```
Embed: File 10 KB → Agent reads 10 KB tokens
Link:  File 2 KB + API call 8 KB → Same 10 KB tokens + overhead
```

Only link content that's **conditionally accessed**.
