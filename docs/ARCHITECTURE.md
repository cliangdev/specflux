# Architecture

Technical overview for contributors and curious developers.

## AI-Assisted Development

A typical AI development workflow using Claude Code:

```mermaid
flowchart LR
    subgraph PRD ["📋 PRD Phase"]
        P1[CLAUDE.md]
        P2[Skills]
        P3[Commands]
    end

    subgraph Design ["🎨 Design Phase"]
        D1[CLAUDE.md]
        D2[Skills]
        D3[Commands]
    end

    subgraph Execute ["⚡ Execute Phase"]
        E1[CLAUDE.md]
        E2[Skills]
        E3[Commands]
    end

    PRD --> Design --> Execute
    Execute -.->|iterate| PRD
```

Each phase uses the same building blocks:

| Concept | Purpose | Example |
|---------|---------|---------|
| **CLAUDE.md** | Project instructions, conventions | Code style, architecture decisions |
| **Skills** | Reusable domain knowledge | API patterns, UI guidelines |
| **Commands** | Workflows triggered by `/command` | `/prd`, `/design`, `/implement` |

This structure gives AI the context it needs to make consistent decisions across your codebase.

## How SpecFlux Adds Context

SpecFlux bridges the gap between project management and AI execution:

```mermaid
flowchart TB
    subgraph SpecFlux ["SpecFlux App"]
        PRD[PRD Document]
        Epic[Epic + Tasks]
        AC[Acceptance Criteria]
    end

    subgraph Injection ["Context Injection"]
        Skill[specflux-skill]
    end

    subgraph Agent ["Claude Code"]
        Terminal[Terminal Session]
    end

    PRD --> Skill
    Epic --> Skill
    AC --> Skill
    Skill -->|"env vars + skill"| Terminal
    Terminal -->|API calls| SpecFlux
```

**What gets injected:**

1. **Environment variables** — `SPECFLUX_API_URL`, `SPECFLUX_API_KEY`
2. **specflux-skill** — API patterns for reading/updating tasks
3. **Task context** — Current epic, task, acceptance criteria

The AI agent can now:
- Read the full PRD to understand the goal
- Check task dependencies before starting
- Update task status as it works
- Mark acceptance criteria as complete

## System Architecture

```mermaid
flowchart TB
    subgraph Desktop ["Desktop App (Tauri)"]
        React[React UI]
        Rust[Rust Backend]
        Terminal[xterm.js Terminal]
    end

    subgraph Backend ["Backend (Spring Boot)"]
        API[REST API]
        DB[(PostgreSQL)]
    end

    subgraph External ["External Services"]
        GitHub[GitHub API]
        Firebase[Firebase Auth]
    end

    subgraph Local ["Local System"]
        FS[File System]
        Claude[Claude Code CLI]
    end

    React <--> Rust
    React <--> Terminal
    Terminal <--> Claude
    Claude <--> FS
    Rust <--> API
    API <--> DB
    API <--> GitHub
    React <--> Firebase
    API <--> Firebase
```

## Component Overview

### Frontend (This Repo)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Desktop shell | Tauri 2.x (Rust) | Native app, IPC, system access |
| UI | React 18 + TypeScript | Kanban board, forms, settings |
| Terminal | xterm.js | Claude Code sessions |
| Styling | TailwindCSS | Dark mode, responsive |
| Auth | Firebase SDK | Login, token management |

### Backend ([specflux-backend](https://github.com/specflux/specflux-backend))

| Component | Technology | Purpose |
|-----------|------------|---------|
| API | Spring Boot 4 | REST endpoints |
| Database | PostgreSQL | Projects, epics, tasks |
| Auth | Firebase Admin | Token verification |

### Data Flow

```mermaid
sequenceDiagram
    participant User
    participant App as SpecFlux App
    participant API as Backend API
    participant Claude as Claude Code
    participant FS as File System

    User->>App: Run /implement task
    App->>API: GET task details
    API-->>App: Task + acceptance criteria
    App->>Claude: Launch with context
    Claude->>FS: Read/write code
    Claude->>API: Update task status
    Claude-->>App: Task complete
    App->>User: Show results
```

## Key Design Decisions

1. **Desktop-first** — Full filesystem access, native terminal, offline PRD editing
2. **Backend for state** — Tasks, progress, collaboration stored centrally
3. **Skill injection** — AI learns project patterns without manual prompting
4. **Human gates** — Every phase requires approval before proceeding

## Contributing

- **Frontend issues** — React, Tauri, UI/UX
- **Backend issues** — API, database, auth
- **Skill improvements** — Better context, new commands

See [CONTRIBUTING.md](../CONTRIBUTING.md) for setup instructions.
