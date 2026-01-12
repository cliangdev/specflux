---
name: prd-template
description: PRD structure and patterns for SpecFlux. Use when creating or refining product requirement documents. PRDs should be concise for humans but detailed enough for AI agents to implement.
---

# PRD Template

When creating PRDs for SpecFlux projects, follow these patterns.

## Design Principles

1. **Concise for humans** - Core PRD is 1-2 pages, scannable
2. **Detailed for AI** - Supporting docs provide implementation context
3. **Mermaid diagrams** - Visual flows that are both readable and parseable
4. **Separate concerns** - Core PRD + supporting documents

## File Structure

```
.specflux/prds/{prd-slug}/
├── prd.md              # Core PRD (concise, 1-2 pages)
├── architecture.md     # System diagrams (optional)
├── user-flows.md       # User journey diagrams (optional)
├── data-model.md       # Entity relationships (optional)
├── wireframes.md       # UI layouts (optional)
└── mockups/            # HTML/visual files (optional)
```

## Core PRD Structure

```markdown
# {Project Name}

## Problem Statement
{1-2 paragraphs: Why does this need to exist? Who has this problem?}

## Target Users
- **Primary:** {who and why}
- **Secondary:** {who and why}

## Core Features (MVP)

### 1. {Feature Name}
{Brief description of what it does}
- {Capability 1}
- {Capability 2}

### 2. {Feature Name}
{Brief description}
- {Capability}

## User Flows
{Brief description of key journeys - reference diagrams in supporting docs}

See: [User Flows](./user-flows.md)

## Technical Constraints
- {Platform, language, integration requirements}

## Out of Scope (for now)
- {Feature explicitly not in MVP}
- {Feature deferred to future}

## Success Metrics
- {Measurable outcome 1}
- {Measurable outcome 2}

## Supporting Documents
- [Architecture](./architecture.md)
- [User Flows](./user-flows.md)
- [Wireframes](./wireframes.md)
```

## Supporting Document Templates

### Architecture Diagram (`architecture.md`)

```markdown
# Architecture Overview

## System Context

```mermaid
flowchart TB
    subgraph Users
        User[End User]
    end

    subgraph Frontend
        UI[React App]
        Tauri[Tauri Runtime]
    end

    subgraph Backend
        API[REST API]
        Auth[Auth Service]
    end

    subgraph External
        DB[(PostgreSQL)]
        Firebase[Firebase Auth]
    end

    User --> UI --> Tauri --> API
    API --> Auth --> Firebase
    API --> DB
```

## Components

| Component | Responsibility |
|-----------|----------------|
| **Frontend** | {description} |
| **Backend** | {description} |
| **Database** | {description} |
```

### User Flows (`user-flows.md`)

```markdown
# User Flows

## {Flow Name} (e.g., "User Registration")

```mermaid
flowchart LR
    A[Landing Page] --> B[Sign Up Form]
    B --> C{Valid?}
    C -->|Yes| D[Dashboard]
    C -->|No| E[Show Errors]
    E --> B
```

### Steps
1. User clicks "Sign Up"
2. Enters email and password
3. System validates input
4. On success: redirect to dashboard
5. On error: show validation messages

### Edge Cases
- Email already exists
- Password too weak
- Network timeout
```

### Data Model (`data-model.md`)

```markdown
# Data Model

## Entity Relationships

```mermaid
erDiagram
    USER ||--o{ PROJECT : owns
    PROJECT ||--o{ PRD : contains
    PRD ||--o{ EPIC : breaks_into
    EPIC ||--o{ TASK : contains
    TASK ||--o{ ACCEPTANCE_CRITERIA : has
```

## Entities

### User
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | String | Unique, for auth |
| created_at | Timestamp | Auto-generated |

### Project
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| owner_id | UUID | FK to User |
| name | String | Display name |
```

### Wireframes (`wireframes.md`)

```markdown
# Wireframes

## {Screen Name}

```
+------------------------------------------+
|  Logo    [Search...]         [User Menu] |
+----------+-------------------------------+
|          |                               |
| Sidebar  |     Main Content Area         |
|          |                               |
| - Nav 1  |   +-------+  +-------+        |
| - Nav 2  |   | Card  |  | Card  |        |
| - Nav 3  |   +-------+  +-------+        |
|          |                               |
+----------+-------------------------------+
```

### Elements
- **Header**: Logo, search, user menu
- **Sidebar**: Navigation items
- **Content**: Card grid layout

### Interactions
- Click card → opens detail view
- Hover card → show quick actions
```

### State Machine (`states.md`)

```markdown
# State Machine

## {Entity} States (e.g., "Task Status")

```mermaid
stateDiagram-v2
    [*] --> BACKLOG
    BACKLOG --> IN_PROGRESS: Start work
    IN_PROGRESS --> COMPLETED: All criteria met
    IN_PROGRESS --> BLOCKED: Blocker found
    BLOCKED --> IN_PROGRESS: Blocker resolved
    COMPLETED --> [*]
```

### Transitions
| From | To | Trigger |
|------|-----|---------|
| BACKLOG | IN_PROGRESS | Developer starts task |
| IN_PROGRESS | COMPLETED | All tests pass |
| IN_PROGRESS | BLOCKED | External dependency |
```

## Best Practices

### Keep Core PRD Concise
- Problem statement: 1-2 paragraphs max
- Features: 3-5 for MVP
- No implementation details in core PRD

### Use Mermaid for All Diagrams
- Flowcharts for user journeys
- ERD for data models
- State diagrams for status flows
- Sequence diagrams for API interactions

### Reference Documents Correctly
- Always use relative paths: `./architecture.md`
- List all supporting docs at end of core PRD
- Cross-reference between documents

### Write for Both Audiences
- **Humans**: Scannable, no jargon, clear business value
- **AI Agents**: Specific requirements, clear acceptance criteria, implementation hints

## Document Types for API

When registering documents via API:
- `PRD` - Primary PRD document
- `WIREFRAME` - UI layouts and mockups
- `DESIGN` - Architecture, data models, flows
- `MOCKUP` - Visual designs (HTML/images)
- `OTHER` - Any other supporting document
