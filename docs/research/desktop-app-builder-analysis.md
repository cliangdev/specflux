# Research: Building a Desktop App for Autonomous App Development

## Executive Summary

This document analyzes the autonomous coding agent pattern from Anthropic's engineering research and the `autonomous-coding` demo implementation. The goal is to design a general-purpose desktop application (macOS/Windows) that enables users to build applications through an autonomous multi-session AI agent workflow.

---

## Part 1: Process Analysis

### Core Problem Statement

AI agents face a fundamental challenge: **context window limitations**. A single session cannot build a complete application. The solution is a structured multi-session approach with:
1. Persistent progress tracking
2. Clear session handoffs
3. Incremental, verified feature completion

### The Two-Agent Pattern

```mermaid
flowchart TB
    subgraph "Session 1: Initializer Agent"
        A[Read app_spec.txt] --> B[Generate feature_list.json<br/>200+ test cases]
        B --> C[Create init.sh<br/>environment setup]
        C --> D[Initialize git repo]
        D --> E[Create project structure]
        E --> F[Write claude-progress.txt]
    end

    subgraph "Sessions 2+: Coding Agent"
        G[Get bearings<br/>pwd, ls, git log] --> H[Read progress artifacts<br/>feature_list.json<br/>claude-progress.txt]
        H --> I[Start servers<br/>./init.sh]
        I --> J[Verify existing features<br/>run 1-2 passing tests]
        J --> K{Regressions found?}
        K -->|Yes| L[Fix regressions first]
        K -->|No| M[Pick next failing feature]
        L --> M
        M --> N[Implement feature]
        N --> O[Test via browser automation]
        O --> P{Feature works?}
        P -->|No| N
        P -->|Yes| Q[Mark passes: true]
        Q --> R[Git commit]
        R --> S[Update claude-progress.txt]
        S --> T{Context filling up?}
        T -->|No| J
        T -->|Yes| U[End session cleanly]
    end

    F --> G
    U -.->|Next session| G
```

### Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Fresh_Context: New Session Starts

    Fresh_Context --> Orient: Agent has no memory
    Orient --> Read_Artifacts: pwd, ls -la
    Read_Artifacts --> Understand_State: feature_list.json<br/>claude-progress.txt<br/>git log

    Understand_State --> Start_Environment: Run init.sh
    Start_Environment --> Verify_Existing: Test 1-2 passing features

    Verify_Existing --> Fix_Regressions: Issues found
    Fix_Regressions --> Verify_Existing

    Verify_Existing --> Select_Feature: All good
    Select_Feature --> Implement: Pick highest priority failing test

    Implement --> Test_E2E: Browser automation
    Test_E2E --> Implement: Failed
    Test_E2E --> Mark_Complete: Passed

    Mark_Complete --> Commit: Update feature_list.json
    Commit --> Update_Progress: Write claude-progress.txt

    Update_Progress --> Select_Feature: Context has room
    Update_Progress --> Clean_Exit: Context filling up

    Clean_Exit --> [*]: Session ends
```

### Progress Tracking Architecture

```mermaid
flowchart LR
    subgraph "Persistent Artifacts"
        FL[feature_list.json<br/>Source of Truth]
        CP[claude-progress.txt<br/>Session Notes]
        GH[Git History<br/>Audit Trail]
        IS[init.sh<br/>Environment Setup]
    end

    subgraph "Session N"
        AN[Agent N]
    end

    subgraph "Session N+1"
        AN1[Agent N+1]
    end

    FL --> AN
    CP --> AN
    GH --> AN

    AN -->|Update passes field| FL
    AN -->|Append notes| CP
    AN -->|Commit changes| GH

    FL --> AN1
    CP --> AN1
    GH --> AN1
```

### Security Model

```mermaid
flowchart TB
    subgraph "Defense in Depth"
        L1[Layer 1: OS Sandbox<br/>Isolated bash execution]
        L2[Layer 2: Filesystem Restrictions<br/>Project directory only]
        L3[Layer 3: Command Allowlist<br/>Validated via hooks]
    end

    CMD[Agent Bash Command] --> L1
    L1 --> L2
    L2 --> L3
    L3 -->|Allowed| EXEC[Execute]
    L3 -->|Blocked| DENY[Block with reason]

    subgraph "Allowed Commands"
        FILE[ls, cat, head, tail, wc, grep]
        NODE[npm, node]
        GIT[git]
        PROC[ps, lsof, sleep, pkill*]
    end
```

---

## Part 2: Key Failure Modes & Solutions

| Failure Mode | Problem | Solution |
|--------------|---------|----------|
| **Premature Victory** | Agent claims completion without verification | Comprehensive feature_list.json with mandatory browser testing |
| **Environmental Degradation** | Broken state between sessions | Git commits + progress file + regression testing |
| **Incomplete Marking** | Features marked done but broken | Screenshot verification + E2E browser automation |
| **Setup Confusion** | Agent doesn't know how to start | init.sh script created by initializer |
| **Context Exhaustion** | Mid-feature context overflow | One feature at a time + clean exit protocol |
| **Feature Drift** | Tests modified/removed | JSON format + strict "only change passes" rule |

---

## Part 3: Desktop App Architecture

### High-Level Architecture

```mermaid
flowchart TB
    subgraph "Desktop App (Electron/Tauri)"
        UI[User Interface]
        PM[Project Manager]
        SM[Session Manager]
        SEC[Security Layer]

        subgraph "Core Services"
            SDK[Claude Agent SDK]
            FS[File System Service]
            GIT[Git Service]
            TERM[Terminal/Sandbox]
            BROWSER[Browser Automation]
        end
    end

    subgraph "Project Workspace"
        SPEC[app_spec.txt]
        FEAT[feature_list.json]
        PROG[claude-progress.txt]
        CODE[Application Code]
        REPO[Git Repository]
    end

    USER((User)) --> UI
    UI --> PM
    PM --> SM
    SM --> SDK

    SDK --> SEC
    SEC --> FS
    SEC --> GIT
    SEC --> TERM
    SEC --> BROWSER

    FS --> SPEC
    FS --> FEAT
    FS --> PROG
    FS --> CODE
    GIT --> REPO
```

### User Interface Components

```mermaid
flowchart TB
    subgraph "Main Window"
        subgraph "Left Panel"
            PROJ[Project List]
            NEW[+ New Project]
        end

        subgraph "Center Panel"
            SPEC_EDIT[Spec Editor]
            PROGRESS[Progress Dashboard]
            LOGS[Session Logs]
        end

        subgraph "Right Panel"
            FEAT_LIST[Feature List<br/>with pass/fail status]
            FEAT_DETAIL[Feature Details]
        end

        subgraph "Bottom Panel"
            TERMINAL[Agent Terminal Output]
            CONTROLS[Start/Pause/Stop]
        end
    end

    subgraph "Preview Window"
        PREVIEW[Live App Preview<br/>Browser View]
    end
```

### Session Management Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as Desktop App
    participant SM as Session Manager
    participant SDK as Claude SDK
    participant FS as File System

    U->>App: Create New Project
    App->>FS: Create project directory
    App->>U: Open Spec Editor
    U->>App: Write app specification
    App->>FS: Save app_spec.txt

    U->>App: Click "Start Building"
    App->>SM: Initialize project
    SM->>SDK: Start Session 1 (Initializer)

    loop Initializer Session
        SDK->>FS: Read app_spec.txt
        SDK->>FS: Write feature_list.json
        SDK->>FS: Write init.sh
        SDK->>FS: Git init & commit
        SDK->>App: Session complete
    end

    App->>U: Show progress dashboard

    loop Coding Sessions
        SM->>SDK: Start Coding Session N
        SDK->>FS: Read artifacts
        SDK->>App: Stream progress
        App->>U: Update UI (live)
        SDK->>FS: Update feature_list.json
        SDK->>FS: Git commit
        SDK->>App: Session complete

        alt User Pause
            U->>App: Pause
            App->>SM: Save state
        else Auto-continue
            SM->>SDK: Start Session N+1
        end
    end

    App->>U: Project complete!
```

---

## Part 4: General-Purpose Tool Design

### Abstraction Layers

To make this a general-purpose tool, we need to abstract the domain-specific elements:

```mermaid
flowchart TB
    subgraph "Configurable Components"
        TEMPLATE[Project Templates<br/>Web App, Mobile, CLI, etc.]
        PROMPTS[Prompt Templates<br/>Initializer, Coding Agent]
        TOOLS[Tool Configurations<br/>Allowed commands per template]
        VERIFY[Verification Methods<br/>Browser, CLI, API tests]
    end

    subgraph "Core Engine"
        ENGINE[Autonomous Agent Engine]
    end

    subgraph "Outputs"
        WEB[Web Applications]
        MOBILE[Mobile Apps]
        CLI_APP[CLI Tools]
        API[APIs/Services]
        DOCS[Documentation]
    end

    TEMPLATE --> ENGINE
    PROMPTS --> ENGINE
    TOOLS --> ENGINE
    VERIFY --> ENGINE

    ENGINE --> WEB
    ENGINE --> MOBILE
    ENGINE --> CLI_APP
    ENGINE --> API
    ENGINE --> DOCS
```

### Template System

```yaml
# Example: web-app-template.yaml
name: "Full-Stack Web Application"
description: "Next.js + Node.js web application"

prompts:
  initializer: "prompts/web/initializer.md"
  coding: "prompts/web/coding.md"

tools:
  allowed_commands:
    - npm
    - node
    - git
    - ls
    - cat
    # ... etc

  mcp_servers:
    - puppeteer  # Browser automation

verification:
  method: "browser"
  startup_command: "npm run dev"
  base_url: "http://localhost:3000"

feature_generation:
  min_features: 50
  max_features: 200
  categories:
    - functional
    - ui/ux
    - accessibility
    - performance
```

### Multi-Project Dashboard

```mermaid
flowchart TB
    subgraph "Dashboard View"
        subgraph "Project Cards"
            P1[Project 1<br/>E-commerce App<br/>75/200 features ✓<br/>🟢 Running]
            P2[Project 2<br/>Chat Application<br/>120/150 features ✓<br/>⏸️ Paused]
            P3[Project 3<br/>Portfolio Site<br/>50/50 features ✓<br/>✅ Complete]
        end

        subgraph "Actions"
            START[▶️ Start]
            PAUSE[⏸️ Pause]
            VIEW[👁️ View]
            EXPORT[📦 Export]
        end
    end

    P1 --> PAUSE
    P1 --> VIEW
    P2 --> START
    P2 --> VIEW
    P3 --> VIEW
    P3 --> EXPORT
```

---

## Part 5: Implementation Recommendations

### Technology Stack

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| **Desktop Framework** | Tauri (Rust + Web) | Smaller bundle, better security, native performance |
| **Frontend** | React + TypeScript | Rich ecosystem, good for complex UIs |
| **State Management** | Zustand or Jotai | Simple, works well with React |
| **Terminal Emulation** | xterm.js | Battle-tested, good performance |
| **Browser Preview** | Embedded WebView | Native preview without external browser |
| **Agent SDK** | claude-code-sdk (Python) | Official SDK, spawn as subprocess |
| **IPC** | Tauri Commands | Type-safe Rust ↔ TypeScript communication |

### MVP Feature Set

1. **Project Creation**
   - Spec editor with markdown preview
   - Template selection (start with web app only)
   - Project directory configuration

2. **Session Management**
   - Start/pause/resume sessions
   - Auto-continue with configurable delay
   - Manual intervention capability

3. **Progress Visualization**
   - Feature list with pass/fail status
   - Progress bar and statistics
   - Session history timeline

4. **Live Output**
   - Terminal view of agent activity
   - Tool use visualization
   - Error highlighting

5. **App Preview**
   - Embedded browser for web apps
   - Auto-refresh on changes

### Security Considerations

```mermaid
flowchart TB
    subgraph "Security Architecture"
        subgraph "User Controls"
            ALLOW[Command Allowlist Config]
            DIR[Workspace Directory Selection]
            APPROVE[Manual Approval Mode]
        end

        subgraph "System Protections"
            SANDBOX[OS Sandbox<br/>macOS: sandbox-exec<br/>Windows: AppContainer]
            ISOLATION[Project Isolation<br/>Each project in separate dir]
            HOOKS[Pre-execution Hooks<br/>Validate all commands]
        end

        subgraph "Audit"
            LOG[Full Command Logging]
            GIT_HIST[Git History]
            ROLLBACK[One-click Rollback]
        end
    end

    ALLOW --> HOOKS
    DIR --> ISOLATION
    APPROVE --> HOOKS

    HOOKS --> LOG
    SANDBOX --> LOG
```

---

## Part 6: Extensibility

### Plugin Architecture

```mermaid
flowchart LR
    subgraph "Core App"
        ENGINE[Agent Engine]
        UI[User Interface]
    end

    subgraph "Plugins"
        P1[Template Plugins<br/>New project types]
        P2[Verification Plugins<br/>Custom testing methods]
        P3[Tool Plugins<br/>Additional commands]
        P4[UI Plugins<br/>Custom views]
    end

    P1 --> ENGINE
    P2 --> ENGINE
    P3 --> ENGINE
    P4 --> UI
```

### Future Enhancements

1. **Multi-Agent Specialization**
   - Separate QA agent for testing
   - Code review agent for quality
   - Documentation agent

2. **Collaboration Features**
   - Share projects
   - Export/import configurations
   - Team workspaces

3. **Learning & Adaptation**
   - Remember successful patterns
   - User feedback integration
   - Performance optimization over time

---

## Conclusion

The autonomous coding pattern from Anthropic's research provides a solid foundation for building a general-purpose app development tool. The key insights are:

1. **Structured Handoffs** - Persistent artifacts (feature_list.json, progress file, git) enable seamless session continuation
2. **Incremental Progress** - One feature at a time prevents context exhaustion
3. **Verification First** - Browser automation ensures features actually work
4. **Defense in Depth** - Multiple security layers protect the user's system

A desktop application can package these patterns into a user-friendly interface, allowing non-technical users to build applications by simply describing what they want. The template system enables expansion to different application types beyond web apps.

---

## References

- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - Anthropic Engineering Blog
- autonomous-coding demo in claude-quickstarts repository
- Claude Agent SDK documentation
