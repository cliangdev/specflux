# Agent Assignment & Context Injection Design

## Overview

This document describes how SpecFlux assigns agents to tasks and injects agent configuration into Claude Code terminal sessions.

## Problem Statement

1. **Agents are defined per project** in `.claude/agents/` (e.g., `backend-dev.md`, `frontend-dev.md`)
2. **Tasks need agent assignment** - each task should specify which agent executes it
3. **Multi-repo support** - Projects may have:
   - Parent folder with sub-repos (`specflux/backend/`, `specflux/frontend/`)
   - Sibling folders (`workspace/specflux/`, `workspace/backend/`, `workspace/frontend/`)
4. **Context injection** - When Claude Code starts, it needs the agent's configuration applied

## Current Architecture

```mermaid
sequenceDiagram
    participant UI as Frontend UI
    participant WS as WebSocket Server
    participant AS as Agent Service
    participant CS as Context Service
    participant PTY as PTY Process
    participant CC as Claude Code

    UI->>WS: Connect /ws/terminal/task/123
    WS->>AS: spawnAgentForContext('task', 123)
    AS->>CS: getTaskContext(123)
    CS-->>AS: Task details, deps, epic PRD
    AS->>AS: Write CLAUDE.md
    AS->>PTY: Spawn claude "initial prompt"
    PTY->>CC: Start Claude Code
    CC->>CC: Read CLAUDE.md
    PTY-->>WS: Output stream
    WS-->>UI: Terminal output
```

### Current Gaps

| Component | Current State | Gap |
|-----------|--------------|-----|
| Task DB | Has `agent_name` field | Not read when spawning |
| Project Config | Has `default_agent` | Not used |
| Agent Files | Exist in `.claude/agents/` | Never loaded |
| Context Service | Generates task context | No agent config included |
| Agent Service | Spawns PTY | No agent selection |

## Proposed Solution

### Data Model Changes

```mermaid
erDiagram
    projects ||--o{ repositories : has
    projects ||--o{ epics : has
    projects ||--o{ agents : defines
    epics ||--o{ tasks : contains
    tasks ||--o| agents : assigned_to
    repositories ||--o{ tasks : targets

    projects {
        int id PK
        string name
        string root_path
        string default_agent_id FK
    }

    agents {
        int id PK
        int project_id FK
        string name
        string file_path
        string description
        json capabilities
    }

    tasks {
        int id PK
        int epic_id FK
        int repository_id FK
        int assigned_agent_id FK
        string executor_type
        string title
        text description
    }

    repositories {
        int id PK
        int project_id FK
        string name
        string path
    }
```

### Agent Assignment Modes

There are two ways agents get assigned to tasks:

1. **Manual Assignment** - Human explicitly selects an agent from dropdown
2. **AI Assignment** - When AI creates tasks (via conversation), it includes agent assignment

The SpecFlux app itself does NOT auto-detect agents. Assignment happens either through:
- User manually selecting an agent in the UI
- AI suggesting agents when user asks AI to create/update tasks

```mermaid
flowchart TD
    subgraph Creation ["Task Creation"]
        A[Create Task] --> B{Source?}
        B -->|Human via UI| C[Manual Task Entry]
        B -->|AI via Conversation| D[AI Generated from Epic/PRD]
    end

    subgraph Assignment ["Agent Assignment"]
        C --> E[Human Selects Agent<br/>from Dropdown]
        D --> F[AI Suggests Agent<br/>in Response]
        F --> G{Human Reviews}
        G -->|Approve| H[Use AI Suggestion]
        G -->|Override| E
    end

    subgraph Fallback ["Default Resolution (Runtime)"]
        E --> I{Agent Assigned?}
        H --> I
        I -->|Yes| J[Use Assigned Agent]
        I -->|No| K{Repository Default?}
        K -->|Yes| L[Use Repo Default]
        K -->|No| M{Project Default?}
        M -->|Yes| N[Use Project Default]
        M -->|No| O[No Agent Context]
    end

    subgraph Execution ["Start Agent"]
        J --> P[Load Agent Config]
        L --> P
        N --> P
        O --> Q[Start Without Agent Config]
        P --> R[Inject Context + Spawn Claude Code]
        Q --> R
    end
```

### Assignment Priority (Runtime Resolution)

When starting a terminal session, the agent is resolved in this order:

```mermaid
flowchart TD
    A[Start Terminal for Task] --> B{Task has assigned_agent_id?}
    B -->|Yes| C[Use Task's Assigned Agent]
    B -->|No| D{Project has default_agent_id?}
    D -->|Yes| E[Use Project Default]
    D -->|No| F[No Agent - Basic Context Only]

    C --> G[Load Agent Config]
    E --> G
    F --> H[Generate Task Context Only]
    G --> I[Generate Context + Agent Instructions]
    H --> J[Spawn Claude Code]
    I --> J
```

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | Task Assignment | Explicitly assigned to task (manual or AI) |
| 2 | Project Default | Fallback default for the project |
| 3 | None | No agent config, just task context |

### Context Injection Strategy

```mermaid
flowchart LR
    subgraph Sources ["Context Sources"]
        A1[Agent Config<br/>.claude/agents/backend-dev.md]
        A2[Task Details<br/>title, description, criteria]
        A3[Dependencies<br/>blocking tasks, chain outputs]
        A4[Epic PRD<br/>if task belongs to epic]
        A5[Repository Info<br/>path, tech stack]
    end

    subgraph Merge ["Context Merge"]
        B[Context Service]
    end

    subgraph Output ["Injected Context"]
        C1[CLAUDE.md<br/>Written to worktree]
        C2[Initial Prompt<br/>Passed to claude CLI]
        C3[Environment Vars<br/>SPECFLUX_AGENT, etc]
    end

    A1 --> B
    A2 --> B
    A3 --> B
    A4 --> B
    A5 --> B
    B --> C1
    B --> C2
    B --> C3
```

## Wireframes

### Task Detail - Agent Assignment

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Board                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  #123  Implement user authentication                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                         │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────┐ │
│  │ Overview │ Context │ Activity        │  │ Status      [In Progress]│ │
│  └──────────────────────────────────────┘  │ Epic        Auth System  │ │
│                                            │ Repository  backend      │ │
│  ┌────────────────────────────────────┐    │ Priority    High         │ │
│  │ AGENT ASSIGNMENT                   │    │                          │ │
│  │ ┌────────────────────────────────┐ │    │ ─────────────────────────│ │
│  │ │ 🤖 backend-dev            ▼   │ │    │                          │ │
│  │ └────────────────────────────────┘ │    │ OWNER                    │ │
│  │                                    │    │ 👤 John Doe              │ │
│  │ Agent: Backend Developer           │    │                          │ │
│  │ Specializes in Node.js, Express,   │    │ EXECUTOR                 │ │
│  │ database design, and API           │    │ 🤖 backend-dev           │ │
│  │ development.                       │    │                          │ │
│  │                                    │    │ ─────────────────────────│ │
│  │ Capabilities:                      │    │                          │ │
│  │ • TypeScript/Node.js               │    │ ACTIONS                  │ │
│  │ • REST API design                  │    │ ┌─────────────────────┐  │ │
│  │ • SQLite/PostgreSQL                │    │ │ ▶ Start Agent       │  │ │
│  │ • Jest testing                     │    │ └─────────────────────┘  │ │
│  │                                    │    │ ┌─────────────────────┐  │ │
│  │ [Auto-assigned from repository]    │    │ │   Edit Task         │  │ │
│  └────────────────────────────────────┘    │ └─────────────────────┘  │ │
│                                            └──────────────────────────┘ │
│  Description                                                            │
│  ──────────────────────────────────────────────────────────────────────│
│  Add JWT-based authentication with refresh tokens...                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Settings - Agent Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Settings                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ General │ Repositories │ Workflow │ Agents │ Integrations        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  AGENT CONFIGURATION                                      [+ Add Agent] │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                         │
│  Project Default: [backend-dev ▼]                                       │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🤖 backend-dev                                                     │ │
│  │ ─────────────────────────────────────────────────────────────────  │ │
│  │ Backend developer specializing in Node.js, Express, and databases  │ │
│  │                                                                     │ │
│  │ File: .claude/agents/backend-dev.md                                │ │
│  │ Tasks: 12 assigned │ Default for: backend repository               │ │
│  │                                                      [Edit] [View] │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🤖 frontend-dev                                                    │ │
│  │ ─────────────────────────────────────────────────────────────────  │ │
│  │ Frontend developer specializing in React, TypeScript, and Tauri    │ │
│  │                                                                     │ │
│  │ File: .claude/agents/frontend-dev.md                               │ │
│  │ Tasks: 8 assigned │ Default for: frontend repository               │ │
│  │                                                      [Edit] [View] │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🤖 fullstack-dev                                                   │ │
│  │ ─────────────────────────────────────────────────────────────────  │ │
│  │ Full-stack developer for cross-cutting features                    │ │
│  │                                                                     │ │
│  │ File: .claude/agents/fullstack-dev.md                              │ │
│  │ Tasks: 3 assigned │ Default for: (none)                            │ │
│  │                                                      [Edit] [View] │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  REPOSITORY DEFAULTS                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                         │
│  ┌─────────────────────┬─────────────────────────────────────────────┐ │
│  │ Repository          │ Default Agent                               │ │
│  ├─────────────────────┼─────────────────────────────────────────────┤ │
│  │ backend             │ [backend-dev ▼]                             │ │
│  │ frontend            │ [frontend-dev ▼]                            │ │
│  │ shared              │ [fullstack-dev ▼]                           │ │
│  └─────────────────────┴─────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### New Session Dialog - Agent Selection

```
┌───────────────────────────────────────────────────────────┐
│  New Terminal Session                               [X]   │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  CONTEXT MODE                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │ ○ Task      │ │ ○ Epic      │ │ ○ Project   │         │
│  │   (1 task)  │ │   (planning)│ │   (coord)   │         │
│  └─────────────┘ └─────────────┘ └─────────────┘         │
│                                                           │
│  SELECT TASK                                              │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ #123 - Implement user authentication            ▼   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  AGENT                                                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 🤖 backend-dev (from repository default)        ▼   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ℹ️ Agent auto-selected based on task's repository   │ │
│  │    (backend → backend-dev)                          │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  WORKING DIRECTORY                                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ /workspace/specflux/backend                         │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│                              [Cancel]  [Start Session]    │
└───────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Agent Config File Format

```markdown
<!-- .claude/agents/backend-dev.md -->
# Backend Developer Agent

## Role
You are a backend developer specializing in server-side development.

## Tech Stack
- Node.js 20+ with TypeScript (strict mode)
- Express.js for REST APIs
- SQLite with better-sqlite3
- Jest for testing

## Coding Standards
- Always use async/await, never callbacks
- Write typed errors extending Error class
- Use API response envelope: { success: true, data: T } | { success: false, error: string }
- Follow OpenAPI spec for new endpoints

## Testing Requirements
- Write unit tests for all service functions
- Use in-memory SQLite for test isolation
- Aim for 80%+ code coverage

## File Patterns
- Routes: src/routes/{domain}.routes.ts
- Services: src/services/{domain}.service.ts
- Types: src/types/{domain}.types.ts
```

### 2. Context Generation with Agent

```typescript
// context.service.ts - Enhanced

export function generateTaskContextWithAgent(
  task: Task,
  agent: Agent | null
): string {
  const sections: string[] = [];

  // 1. Agent Configuration (if assigned)
  if (agent) {
    const agentConfig = fs.readFileSync(agent.file_path, 'utf-8');
    sections.push('# Agent Configuration\n');
    sections.push(agentConfig);
    sections.push('\n---\n');
  }

  // 2. Task Details
  sections.push(`# Task #${task.id}: ${task.title}\n`);
  sections.push(`**Status:** ${task.status}\n`);
  sections.push(`**Repository:** ${task.repository?.name || 'Not assigned'}\n`);

  if (task.description) {
    sections.push(`\n## Description\n${task.description}\n`);
  }

  if (task.acceptance_criteria) {
    sections.push(`\n## Acceptance Criteria\n${task.acceptance_criteria}\n`);
  }

  // 3. Dependencies
  if (task.dependencies?.length) {
    sections.push('\n## Dependencies\n');
    for (const dep of task.dependencies) {
      const status = dep.status === 'done' ? '✅' : '⏳';
      sections.push(`- ${status} Task #${dep.id}: ${dep.title}\n`);
    }
  }

  // 4. Epic Context (if applicable)
  if (task.epic?.prd_content) {
    sections.push('\n## Epic PRD\n');
    sections.push(task.epic.prd_content);
  }

  return sections.join('');
}
```

### 3. Agent Spawning with Config

```typescript
// agent.service.ts - Enhanced spawnAgentForContext

export async function spawnAgentForContext(
  contextType: ContextType,
  contextId: number,
  config?: SpawnConfig
): Promise<SpawnResult> {
  const task = await getTaskById(contextId);
  if (!task) throw new Error('Task not found');

  // 1. Resolve agent (explicit > repo default > project default)
  const agent = await resolveAgentForTask(task);

  // 2. Get working directory (worktree for task, repo path otherwise)
  const workDir = await getWorkingDirectory(task);

  // 3. Generate context with agent config included
  const context = generateTaskContextWithAgent(task, agent);

  // 4. Write CLAUDE.md
  const claudeMdPath = path.join(workDir, 'CLAUDE.md');
  fs.writeFileSync(claudeMdPath, context);

  // 5. Spawn Claude Code
  const env = {
    ...process.env,
    SPECFLUX_CONTEXT_TYPE: contextType,
    SPECFLUX_CONTEXT_ID: String(contextId),
    SPECFLUX_AGENT: agent?.name || 'default',
  };

  const initialPrompt = generateInitialPrompt(task, agent);

  return spawnPty({
    command: 'claude',
    args: [initialPrompt],
    cwd: workDir,
    env,
    cols: config?.cols || 120,
    rows: config?.rows || 40,
  });
}

async function resolveAgentForTask(task: Task): Promise<Agent | null> {
  // 1. Check task's explicit assignment
  if (task.assigned_agent_id) {
    return getAgentById(task.assigned_agent_id);
  }

  // 2. Check project default
  const project = await getProjectById(task.project_id);
  if (project?.default_agent_id) {
    return getAgentById(project.default_agent_id);
  }

  return null;
}
```

### 4. Database Migration

```sql
-- migrations/010_agent_assignment.sql

-- UP
CREATE TABLE agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  description TEXT,
  capabilities TEXT, -- JSON array of capability tags
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name)
);

-- Add agent references
ALTER TABLE tasks ADD COLUMN assigned_agent_id INTEGER REFERENCES agents(id);
ALTER TABLE projects ADD COLUMN default_agent_id INTEGER REFERENCES agents(id);

-- DOWN
ALTER TABLE projects DROP COLUMN default_agent_id;
ALTER TABLE tasks DROP COLUMN assigned_agent_id;
DROP TABLE agents;
```

## Worktree vs Feature Branch

### Comparison

| Aspect | Git Worktree | Feature Branch |
|--------|--------------|----------------|
| **Parallel work** | ✅ Multiple tasks work simultaneously in separate folders | ❌ Must stash/commit before switching tasks |
| **Disk space** | ❌ Full copy of files per task | ✅ Single copy, just switch branches |
| **Setup complexity** | ❌ More complex (create/cleanup worktrees) | ✅ Simple `git checkout -b` |
| **Claude Code isolation** | ✅ Each task has isolated terminal session | ⚠️ Shared terminal, must manage context |
| **Merge conflicts** | ✅ Detected early, each worktree independent | ⚠️ Conflicts found when switching back |
| **File watching** | ✅ IDE can watch multiple worktrees | ❌ IDE only sees current branch |

### When to Use Each

**Use Worktrees when:**
- Running multiple Claude Code agents in parallel on different tasks
- Tasks might conflict (touching same files)
- Long-running tasks that shouldn't block other work
- Need complete isolation between tasks

**Use Feature Branches when:**
- Sequential task execution (one at a time)
- Simple projects with few concurrent tasks
- Disk space is limited
- Simpler mental model preferred

### Recommendation for SpecFlux

**Default: Worktrees** - Since SpecFlux's goal is orchestrating multiple Claude Code agents across tasks, worktrees provide the isolation needed for parallel execution.

**Optional: Feature Branch mode** - For simpler projects or users who prefer the branch model, we could support a "lightweight mode" that just creates branches without worktrees.

```typescript
// Task execution modes
type ExecutionMode = 'worktree' | 'branch';

interface ProjectSettings {
  execution_mode: ExecutionMode;  // Default: 'worktree'
}
```

## Folder Structure Support

### How Agents & Skills Get Applied

Claude Code looks for `.claude/` in the **working directory** where it's launched. This affects how we handle different folder structures:

| Structure | Working Directory | `.claude/` Location | How It Works |
|-----------|-------------------|---------------------|--------------|
| Mono-repo | Project root | Project root | ✅ Claude finds `.claude/` automatically |
| Sibling repos | Repo folder | Project root (different folder) | ⚠️ Need to copy/symlink `.claude/` to worktree |

### Mono-repo (Parent with Sub-folders)

```
specflux/                       # Project root = working directory
├── .claude/                    # ✅ Claude Code finds this
│   ├── agents/
│   │   ├── backend-dev.md
│   │   └── frontend-dev.md
│   └── skills/
│       ├── api-design/
│       └── ui-patterns/
├── backend/                    # Repository 1
│   ├── src/
│   └── package.json
├── frontend/                   # Repository 2
│   ├── src/
│   └── package.json
└── .specflux/
    └── worktrees/
        └── task-123/           # Worktree created here
            └── backend/        # Git worktree of backend
```

**How agents/skills work:**
- Claude Code runs from project root (`/workspace/specflux`)
- `.claude/agents/` and `.claude/skills/` are in the same folder
- ✅ Everything works automatically

**Configuration:**
- Project `root_path`: `/workspace/specflux`
- Repository `backend` path: `backend` (relative)
- Repository `frontend` path: `frontend` (relative)
- Agents & skills defined at project level, shared across repos

### Sibling Repos (Separate Folders)

```
workspace/
├── specflux/                   # Project management
│   ├── .claude/                # Agents & skills defined here
│   │   ├── agents/
│   │   └── skills/
│   └── .specflux/
│       └── worktrees/
│           └── task-123/       # Worktree for backend task
│               ├── .claude/    # ⬅️ Symlink to specflux/.claude/
│               └── (backend files)
├── backend/                    # Separate repo
│   └── src/
└── frontend/                   # Separate repo
    └── src/
```

**How agents/skills work:**
- Claude Code runs from worktree (`/workspace/specflux/.specflux/worktrees/task-123`)
- `.claude/` is NOT in the worktree by default
- **Solution:** When creating worktree, symlink or copy `.claude/` from project root

```typescript
// When spawning agent for sibling repo task:
async function prepareWorktree(task: Task, project: Project) {
  const worktreePath = createWorktree(task);

  // Symlink .claude from project to worktree
  const projectClaudePath = path.join(project.root_path, '.claude');
  const worktreeClaudePath = path.join(worktreePath, '.claude');

  if (fs.existsSync(projectClaudePath)) {
    fs.symlinkSync(projectClaudePath, worktreeClaudePath);
  }

  return worktreePath;
}
```

**Configuration:**
- Project `root_path`: `/workspace/specflux`
- Repository `backend` path: `/workspace/backend` (absolute)
- Repository `frontend` path: `/workspace/frontend` (absolute)
- Worktrees created in project's `.specflux/worktrees/`
- `.claude/` symlinked into each worktree

## AI-Assisted Task Creation

When a user asks AI (via conversation) to create epics and tasks, the AI should include agent assignments in its suggestions. This happens in the AI conversation, not in the SpecFlux app logic.

### Example AI Conversation Flow

```
User: "Create an epic for user authentication with login and signup"

AI: "I'll create an epic with the following tasks:

Epic: User Authentication System

Tasks:
1. Create auth database schema
   - Repository: backend
   - Agent: 🔧 backend-dev

2. Implement login/signup API endpoints
   - Repository: backend
   - Agent: 🔧 backend-dev

3. Create login form component
   - Repository: frontend
   - Agent: 🎨 frontend-dev

4. Integrate auth flow end-to-end
   - Repository: (both)
   - Agent: ⚡ fullstack-dev

Would you like me to create these tasks?"
```

The AI uses its knowledge of the project's agents (from `.claude/agents/`) to suggest appropriate assignments. The user can approve or modify before the tasks are created.

## API Changes

### New Endpoints

```yaml
# GET /api/projects/:id/agents
# List all agents for a project
responses:
  200:
    data:
      - id: 1
        name: backend-dev
        file_path: .claude/agents/backend-dev.md
        description: Backend developer for Node.js/Express
        capabilities: ["typescript", "nodejs", "rest-api", "sqlite"]

# POST /api/projects/:id/agents
# Create/sync agent from file
request:
  name: backend-dev
  file_path: .claude/agents/backend-dev.md
  description: Backend developer

# PATCH /api/tasks/:id
# Assign agent to task
request:
  assigned_agent_id: 1

# GET /api/tasks/:id/agent-config
# Get resolved agent config for a task
responses:
  200:
    data:
      agent:
        id: 1
        name: backend-dev
      source: repository_default  # or task_assignment, project_default
      config_content: "# Backend Developer Agent..."
```

## Settings Page: Agent, Skills & MCP Management

### Design Philosophy

Based on best practices from [Claude Code documentation](https://www.anthropic.com/engineering/claude-code-best-practices), [AGENTS.md standard](https://agents.md/), and [JetBrains coding guidelines](https://blog.jetbrains.com/idea/2025/05/coding-guidelines-for-your-ai-agents/):

**Agent Creation Approaches:**

1. **AI-Generated (Recommended)** - Let Claude generate agent definitions based on your project structure and tech stack. This follows Anthropic's recommendation: "Start with Claude-generated agents... then iterate to make it personally yours."

2. **Template-Based** - Copy from a curated library of common agent templates (backend-dev, frontend-dev, devops, etc.)

3. **Manual Import** - Paste existing agent markdown from another project or online source

4. **Auto-Discovery** - Scan `.claude/agents/` folder and import existing definitions

### Wireframe: Settings - Agents Tab (Card View)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────┬───────────────┬──────────┬─────────────┬──────────────────┐  │
│  │  General  │  Repositories │  Agents  │   Skills    │  MCP Services    │  │
│  └───────────┴───────────────┴──────────┴─────────────┴──────────────────┘  │
│                                    ▲                                         │
│                                 selected                                     │
│                                                                              │
│  PROJECT AGENTS                                            [+ Create Agent]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  Project Default: [🔧 backend-dev ▼]                                         │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │                                 │  │                                 │   │
│  │  🔧                             │  │  🎨                             │   │
│  │  backend-dev                    │  │  frontend-dev                   │   │
│  │  ─────────────────────────────  │  │  ─────────────────────────────  │   │
│  │  Backend developer specializing │  │  Frontend developer for React,  │   │
│  │  in Node.js, Express, and       │  │  TypeScript, and Tauri desktop  │   │
│  │  database design.               │  │  applications.                  │   │
│  │                                 │  │                                 │   │
│  │  📂 .claude/agents/backend-dev  │  │  📂 .claude/agents/frontend-dev │   │
│  │                                 │  │                                 │   │
│  │  ┌─────────────────────────┐   │  │  ┌─────────────────────────┐   │   │
│  │  │ nodejs  typescript api │   │  │  │ react  tailwind  tauri │   │   │
│  │  └─────────────────────────┘   │  │  └─────────────────────────┘   │   │
│  │                                 │  │                                 │   │
│  │  Tasks: 12  │  Default: backend │  │  Tasks: 8   │  Default: frontend│   │
│  │                                 │  │                                 │   │
│  │           [Edit]  [Delete]      │  │           [Edit]  [Delete]      │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │                                 │  │                                 │   │
│  │  ⚡                             │  │  ➕                 [dashed]    │   │
│  │  fullstack-dev                  │  │                                 │   │
│  │  ─────────────────────────────  │  │  Add New Agent                  │   │
│  │  Full-stack developer for       │  │  ─────────────────────────────  │   │
│  │  cross-cutting features that    │  │  Generate with AI, import from  │   │
│  │  span frontend and backend.     │  │  template, or paste definition  │   │
│  │                                 │  │                                 │   │
│  │  📂 .claude/agents/fullstack    │  │                                 │   │
│  │                                 │  │  [+ Create Agent]               │   │
│  │  ┌─────────────────────────┐   │  │                                 │   │
│  │  │ nodejs  react  testing │   │  │                                 │   │
│  │  └─────────────────────────┘   │  │                                 │   │
│  │                                 │  │                                 │   │
│  │  Tasks: 3   │  Default: (none)  │  │                                 │   │
│  │                                 │  │                                 │   │
│  │           [Edit]  [Delete]      │  │                                 │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Create Agent Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Create New Agent                                                      [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HOW WOULD YOU LIKE TO CREATE YOUR AGENT?                                    │
│                                                                              │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │                       │  │                       │  │                 │  │
│  │     🤖                │  │     📋                │  │     📝          │  │
│  │                       │  │                       │  │                 │  │
│  │  Generate with AI     │  │  Use Template         │  │  Paste/Import   │  │
│  │  ─────────────────    │  │  ─────────────────    │  │  ───────────    │  │
│  │  Describe your agent  │  │  Start from a         │  │  Paste markdown │  │
│  │  and let AI create    │  │  pre-built agent      │  │  definition or  │  │
│  │  the definition       │  │  template             │  │  import file    │  │
│  │                       │  │                       │  │                 │  │
│  │  [◉ Recommended]      │  │                       │  │                 │  │
│  └───────────────────────┘  └───────────────────────┘  └─────────────────┘  │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  🤖 AI GENERATION (Selected)                                            ││
│  │                                                                          ││
│  │  Agent Name                                                              ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │ devops-agent                                                     │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  │  Emoji Avatar                                                            ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │ [🚀] [🔧] [🎨] [⚡] [🔥] [💻] [🛠️] [📦] [🧪] [🔒]                │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  │  Describe this agent's role and capabilities                             ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │ This agent handles DevOps tasks including CI/CD pipelines,      │   ││
│  │  │ Docker containerization, deployment scripts, and infrastructure │   ││
│  │  │ configuration. It should be familiar with GitHub Actions,       │   ││
│  │  │ Docker, and Kubernetes basics.                                  │   ││
│  │  │                                                                  │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  │  Include project context?  [✓] Analyze project structure                 ││
│  │                            [✓] Include tech stack from package.json      ││
│  │                            [ ] Include existing agent patterns           ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│                                         [Cancel]  [Generate Agent Definition]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Agent Generated Preview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Review Generated Agent                                                [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  🚀 devops-agent                                                       │ │
│  │  DevOps engineer for CI/CD and infrastructure                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  GENERATED DEFINITION                                              [Edit]   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ---                                                                    │ │
│  │ name: devops-agent                                                     │ │
│  │ description: DevOps engineer for CI/CD pipelines and infrastructure    │ │
│  │ model: sonnet                                                          │ │
│  │ capabilities:                                                          │ │
│  │   primary:                                                             │ │
│  │     - docker                                                           │ │
│  │     - github-actions                                                   │ │
│  │     - ci-cd                                                            │ │
│  │     - deployment                                                       │ │
│  │   secondary:                                                           │ │
│  │     - kubernetes                                                       │ │
│  │     - terraform                                                        │ │
│  │   file_patterns:                                                       │ │
│  │     - ".github/workflows/**"                                           │ │
│  │     - "Dockerfile*"                                                    │ │
│  │     - "docker-compose*.yml"                                            │ │
│  │ ---                                                                    │ │
│  │                                                                        │ │
│  │ # DevOps Agent                                                         │ │
│  │                                                                        │ │
│  │ You are a DevOps engineer specializing in CI/CD pipelines,             │ │
│  │ containerization, and deployment automation.                           │ │
│  │                                                                        │ │
│  │ ## Your Focus                                                          │ │
│  │ - Create and maintain GitHub Actions workflows                         │ │
│  │ - Write Dockerfiles and docker-compose configurations                  │ │
│  │ - Configure deployment scripts and automation                          │ │
│  │ - Set up monitoring and logging infrastructure                         │ │
│  │                                                                        │ │
│  │ ## Tech Stack                                                          │ │
│  │ - Docker and Docker Compose                                            │ │
│  │ - GitHub Actions for CI/CD                                             │ │
│  │ - Basic Kubernetes concepts                                            │ │
│  │ - Shell scripting (bash)                                               │ │
│  │                                                                        │ │
│  │ ## Best Practices                                                      │ │
│  │ - Use multi-stage builds for smaller images                            │ │
│  │ - Cache dependencies in CI pipelines                                   │ │
│  │ - Use secrets management, never hardcode credentials                   │ │
│  │ - Document deployment procedures                                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Will be saved to: .claude/agents/devops-agent.md                           │
│                                                                              │
│                               [← Back]  [Regenerate]  [Save Agent]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Template Selection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Choose Agent Template                                                 [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Select a template to customize:                                             │
│                                                                              │
│  POPULAR TEMPLATES                                                           │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  🔧 Backend Developer           │  │  🎨 Frontend Developer          │   │
│  │  Node.js, Python, Go, REST APIs │  │  React, Vue, Angular, CSS       │   │
│  │                        [Select] │  │                        [Select] │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  ⚡ Full-Stack Developer        │  │  🗄️ Database Engineer           │   │
│  │  End-to-end feature development │  │  SQL, migrations, optimization  │   │
│  │                        [Select] │  │                        [Select] │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  SPECIALIZED TEMPLATES                                                       │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  🚀 DevOps Engineer             │  │  🧪 QA/Test Engineer            │   │
│  │  CI/CD, Docker, deployment      │  │  Testing, automation, coverage  │   │
│  │                        [Select] │  │                        [Select] │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  🔒 Security Engineer           │  │  📱 Mobile Developer            │   │
│  │  Auth, encryption, OWASP        │  │  React Native, Flutter, iOS     │   │
│  │                        [Select] │  │                        [Select] │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│                                                          [← Back]  [Cancel] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Settings - Skills Tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────┬───────────────┬──────────┬─────────────┬──────────────────┐  │
│  │  General  │  Repositories │  Agents  │   Skills    │  MCP Services    │  │
│  └───────────┴───────────────┴──────────┴─────────────┴──────────────────┘  │
│                                                          ▲                   │
│                                                       selected               │
│                                                                              │
│  PROJECT SKILLS                                       [ⓘ] [+ Add Skill]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ⓘ Skills vs Agents                                                     │ │
│  │                                                                         │ │
│  │ • Agents are assigned per task (who works on it)                       │ │
│  │ • Skills are auto-invoked by Claude Code based on file patterns        │ │
│  │   (e.g., editing .tsx files loads ui-patterns skill automatically)     │ │
│  │                                                                         │ │
│  │ You don't need to assign skills to tasks - Claude handles it.          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │                                 │  │                                 │   │
│  │  📐                             │  │  🎨                             │   │
│  │  api-design                     │  │  ui-patterns                    │   │
│  │  ─────────────────────────────  │  │  ─────────────────────────────  │   │
│  │  REST API design patterns for   │  │  UI design patterns including   │   │
│  │  SpecFlux. OpenAPI specs,       │  │  dark mode, components, colors, │   │
│  │  request/response schemas.      │  │  and Tailwind utilities.        │   │
│  │                                 │  │                                 │   │
│  │  📂 .claude/skills/api-design/  │  │  📂 .claude/skills/ui-patterns/ │   │
│  │                                 │  │                                 │   │
│  │  Auto-invoked for: /routes/**,  │  │  Auto-invoked for: /components/ │   │
│  │  *.routes.ts, openapi/**        │  │  *.tsx, *.css                   │   │
│  │                                 │  │                                 │   │
│  │            [View]  [Edit]       │  │            [View]  [Edit]       │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │                                 │  │                                 │   │
│  │  🗄️                             │  │  📦                             │   │
│  │  database-migrations            │  │  typescript-patterns            │   │
│  │  ─────────────────────────────  │  │  ─────────────────────────────  │   │
│  │  SQLite migration patterns.     │  │  TypeScript best practices,     │   │
│  │  UP/DOWN sections, reversible   │  │  async/await, typed errors,     │   │
│  │  migrations.                    │  │  strict mode compliance.        │   │
│  │                                 │  │                                 │   │
│  │  📂 .claude/skills/db-migrate/  │  │  📂 .claude/skills/typescript/  │   │
│  │                                 │  │                                 │   │
│  │  Auto-invoked for: migrations/, │  │  Auto-invoked for: *.ts, *.tsx  │   │
│  │  *.sql                          │  │                                 │   │
│  │                                 │  │                                 │   │
│  │            [View]  [Edit]       │  │            [View]  [Edit]       │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────┐                                        │
│  │                                 │                                        │
│  │  🖥️                             │                                        │
│  │  tauri-dev                      │                                        │
│  │  ─────────────────────────────  │                                        │
│  │  Tauri desktop app patterns.    │                                        │
│  │  IPC, window management,        │                                        │
│  │  Rust-React communication.      │                                        │
│  │                                 │                                        │
│  │  📂 .claude/skills/tauri-dev/   │                                        │
│  │                                 │                                        │
│  │  Auto-invoked for: src-tauri/,  │                                        │
│  │  *.rs, tauri.conf.json          │                                        │
│  │                                 │                                        │
│  │            [View]  [Edit]       │                                        │
│  └─────────────────────────────────┘                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Settings - MCP Services Tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────┬───────────────┬──────────┬─────────────┬──────────────────┐  │
│  │  General  │  Repositories │  Agents  │   Skills    │  MCP Services    │  │
│  └───────────┴───────────────┴──────────┴─────────────┴──────────────────┘  │
│                                                                       ▲      │
│                                                                    selected  │
│                                                                              │
│  MCP SERVERS                                              [+ Add MCP Server] │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                              │
│  Model Context Protocol servers extend Claude's capabilities with external   │
│  tools and data sources.                                                     │
│                                                                              │
│  ACTIVE SERVERS                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  🔌 github                                            ● Connected       ││
│  │  ─────────────────────────────────────────────────────────────────────  ││
│  │  @modelcontextprotocol/server-github                                    ││
│  │                                                                          ││
│  │  Provides: Repository access, PR management, issue tracking             ││
│  │                                                                          ││
│  │  Environment Variables:                                                  ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │ GITHUB_PERSONAL_ACCESS_TOKEN: ●●●●●●●●●●●●●●ghp_xxx            │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  │                                       [Test Connection]  [Edit]  [⋮]    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  📁 filesystem                                        ● Connected       ││
│  │  ─────────────────────────────────────────────────────────────────────  ││
│  │  @modelcontextprotocol/server-filesystem                                ││
│  │                                                                          ││
│  │  Provides: File system operations within project directory              ││
│  │                                                                          ││
│  │  Allowed Paths:                                                          ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │ /Users/cliang/workspace/specflux                                │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  │                                       [Test Connection]  [Edit]  [⋮]    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  AVAILABLE SERVERS                                                           │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  🌐 fetch                       │  │  🐘 postgres                    │   │
│  │  HTTP request capabilities      │  │  PostgreSQL database access     │   │
│  │                        [+ Add]  │  │                        [+ Add]  │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  🔍 brave-search                │  │  📊 memory                      │   │
│  │  Web search via Brave API       │  │  Persistent memory storage      │   │
│  │                        [+ Add]  │  │                        [+ Add]  │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  CONFIG FILE LOCATION                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 📄 .claude/.mcp.json                                       [Open File] ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wireframe: Add MCP Server Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Add MCP Server                                                        [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SERVER CONFIGURATION                                                        │
│                                                                              │
│  Server Name                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ postgres                                                                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Package                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ @modelcontextprotocol/server-postgres                                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Command                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ npx                                                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Arguments                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ -y @modelcontextprotocol/server-postgres                                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ENVIRONMENT VARIABLES                                        [+ Add Variable│
│  ┌───────────────────────────────┬─────────────────────────────────────────┐│
│  │  Variable Name                │  Value                                  ││
│  ├───────────────────────────────┼─────────────────────────────────────────┤│
│  │  POSTGRES_CONNECTION_STRING   │  postgresql://user:pass@localhost/db    ││
│  │                               │                             [🔒 Secret] ││
│  └───────────────────────────────┴─────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ⚠️ Environment variables with secrets should reference ${VAR_NAME}     ││
│  │    to read from system environment instead of storing directly.         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│                                          [Cancel]  [Test]  [Add Server]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Emoji Avatar System for Agents

| Agent Type | Suggested Emojis | Default |
|------------|------------------|---------|
| Backend | 🔧 🛠️ ⚙️ 🔩 | 🔧 |
| Frontend | 🎨 🖌️ 💅 🎭 | 🎨 |
| Full-stack | ⚡ 🔥 💫 ✨ | ⚡ |
| DevOps | 🚀 📦 🐳 ☁️ | 🚀 |
| Database | 🗄️ 💾 📊 🗃️ | 🗄️ |
| Testing | 🧪 🔬 ✅ 🎯 | 🧪 |
| Security | 🔒 🛡️ 🔐 🔑 | 🔒 |
| Mobile | 📱 📲 📳 | 📱 |
| AI/ML | 🤖 🧠 💡 | 🤖 |
| Documentation | 📝 📚 📖 | 📝 |

### Data Model: Skills & MCP Tables

```sql
-- migrations/011_skills_and_mcp.sql

-- UP
CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  folder_path TEXT NOT NULL,  -- .claude/skills/api-design/
  description TEXT,
  file_patterns TEXT,         -- JSON array of glob patterns
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name)
);

CREATE TABLE mcp_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  command TEXT NOT NULL,       -- npx, node, etc
  args TEXT NOT NULL,          -- JSON array
  env_vars TEXT,               -- JSON object with env vars
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name)
);

-- Update agents table to include emoji
ALTER TABLE agents ADD COLUMN emoji TEXT DEFAULT '🤖';

-- DOWN
ALTER TABLE agents DROP COLUMN emoji;
DROP TABLE mcp_servers;
DROP TABLE skills;
```

### API Endpoints for Settings

```yaml
# Skills API
GET /api/projects/:id/skills       # List all skills
POST /api/projects/:id/skills      # Create/import skill
GET /api/projects/:id/skills/:name # Get skill details
PUT /api/projects/:id/skills/:name # Update skill
DELETE /api/projects/:id/skills/:name

# MCP Servers API
GET /api/projects/:id/mcp-servers       # List MCP servers
POST /api/projects/:id/mcp-servers      # Add MCP server
PUT /api/projects/:id/mcp-servers/:name # Update server config
DELETE /api/projects/:id/mcp-servers/:name
POST /api/projects/:id/mcp-servers/:name/test # Test connection

# Agent emoji update
PATCH /api/projects/:id/agents/:name
  { emoji: "🚀" }
```

## Open Questions

1. **Agent file sync**: Should agents be auto-discovered from `.claude/agents/` or manually registered?
2. **Agent versioning**: How to handle agent config changes mid-task?
3. **Multi-agent tasks**: Can a task have multiple agents (e.g., frontend + backend for full-stack)?
4. **MCP server validation**: How to validate MCP server configurations before saving?

## Next Steps

1. Create `agents` table migration
2. Add agent CRUD endpoints
3. Implement `resolveAgentForTask()` in agent.service.ts
4. Update context.service.ts to include agent config
5. Add agent selector to Task Detail UI
6. Add agent management to Settings page (card view with emoji avatars)
7. Create Skills and MCP tables migration
8. Implement Skills and MCP Settings tabs

## References

- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents)
- [AGENTS.md Standard](https://agents.md/)
- [JetBrains AI Coding Guidelines](https://blog.jetbrains.com/idea/2025/05/coding-guidelines-for-your-ai-agents/)
- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
