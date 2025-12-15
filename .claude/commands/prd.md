# /prd - Create or Refine Product Specification

Help the user create or refine a product specification document.

**Skill**: Use `specflux-api` skill for API reference.

## Context from Environment

The terminal session provides context via environment variables:
- `SPECFLUX_PROJECT_REF` - Project reference for API calls (e.g., "SPEC")
- `SPECFLUX_CONTEXT_TYPE` - Current context type (e.g., "prd" when on PRD detail page)
- `SPECFLUX_CONTEXT_ID` - PRD ID if working with existing PRD (e.g., "prd_abc123")
- `SPECFLUX_CONTEXT_REF` - Display key (e.g., "SPEC-P1")
- `SPECFLUX_CONTEXT_TITLE` - PRD title

Use these to automatically determine which project and PRD you're working with.

## Arguments

- `/prd` - Interactive mode: check context or ask what to do
- `/prd draft` - Draft a new PRD (skip existing PRD check)
- `/prd refine` - Refine the current PRD (requires PRD context)

## Process

1. **Check Context First**
   - If `SPECFLUX_CONTEXT_TYPE` is "prd" and `SPECFLUX_CONTEXT_ID` exists:
     - You're working with a specific PRD: `$SPECFLUX_CONTEXT_TITLE` (`$SPECFLUX_CONTEXT_REF`)
     - Fetch PRD details: GET /api/projects/{projectRef}/prds/{prdId}
     - Read the PRD document from `{folderPath}/prd.md`
     - If argument is "draft": Help draft/write the PRD content
     - If argument is "refine": Help improve/expand the existing content
     - Skip step 2 below

2. **No PRD Context - Check for Existing PRDs** (only if no PRD context)
   - Fetch via API: GET /api/projects/{projectRef}/prds
   - If found: List them and ask "Want to refine an existing PRD or create a new one?"
   - If none: Start fresh with a new PRD

3. **Interview** (ask one question at a time, conversationally):
   - What are you building? (if not already provided)
   - What problem does it solve? Who has this problem?
   - What's the simplest version that would be useful?
   - List 3-5 core features for MVP
   - Any technical constraints or preferences?

4. **Generate PRD** using this structure:

```markdown
# {Project Name}

## Problem Statement
{Why does this need to exist? Who has this problem?}

## Target Users
- Primary: {who}
- Secondary: {who}

## Core Features (MVP)
1. {Feature 1} - {brief description}
2. {Feature 2} - {brief description}
3. {Feature 3} - {brief description}

## User Flows
{Describe key user journeys - reference diagrams below}

## Out of Scope (for now)
- {Feature that's explicitly not in MVP}

## Technical Constraints
- {Platform, language, integration requirements}

## Success Metrics
- {How do we know this is working?}
```

5. **Generate Visual Artifacts** (based on what's appropriate for the PRD):

   Create supporting documents to clarify the PRD. Choose what's relevant:

   **Architecture Diagram** (`architecture.md`) - for technical products:
   ```markdown
   # Architecture Overview

   ```mermaid
   flowchart TB
       subgraph Frontend
           UI[React App]
       end
       subgraph Backend
           API[REST API]
           DB[(Database)]
       end
       UI --> API --> DB
   ```

   ## Components
   - **Frontend**: {description}
   - **Backend**: {description}
   - **Database**: {description}
   ```

   **User Flow Diagram** (`user-flows.md`) - for user-facing products:
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
   2. ...
   ```

   **Data Model** (`data-model.md`) - for data-driven products:
   ```markdown
   # Data Model

   ```mermaid
   erDiagram
       USER ||--o{ ORDER : places
       ORDER ||--|{ LINE_ITEM : contains
       PRODUCT ||--o{ LINE_ITEM : "ordered in"
   ```

   ## Entities
   - **User**: {fields and description}
   - **Order**: {fields and description}
   ```

   **Wireframes** (`wireframes.md`) - for UI-heavy products:
   ```markdown
   # Wireframes

   ## {Screen Name}

   ```
   +----------------------------------+
   |  Logo    [Search...]    [Login]  |
   +----------------------------------+
   |                                  |
   |    +--------+  +--------+        |
   |    | Card 1 |  | Card 2 |        |
   |    +--------+  +--------+        |
   |                                  |
   +----------------------------------+
   ```

   ### Elements
   - Header: Logo, search, auth buttons
   - Content: Card grid layout
   ```

   **State Machine** (`states.md`) - for workflow/status-driven products:
   ```markdown
   # State Machine

   ## {Entity} States (e.g., "Order Status")

   ```mermaid
   stateDiagram-v2
       [*] --> Draft
       Draft --> Pending: Submit
       Pending --> Approved: Approve
       Pending --> Rejected: Reject
       Approved --> [*]
       Rejected --> Draft: Revise
   ```
   ```

6. **Create PRD via API** (skip if PRD already exists from context)
   ```
   POST /api/projects/{projectRef}/prds
   {"title": "{prd-name}", "description": "{brief summary}"}
   ```
   This returns the PRD with auto-generated folderPath (e.g., `.specflux/prds/{slug}`)

7. **Save Markdown File** to the folderPath:
   - Save to `{folderPath}/prd.md`

8. **Register Document via API** (skip if document already registered)
   ```
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {
     "fileName": "prd.md",
     "filePath": "{folderPath}/prd.md",
     "documentType": "PRD",
     "isPrimary": true
   }
   ```

9. **Suggest Epics**:
   "I've identified these potential epics from your PRD:
   1. {Epic 1}
   2. {Epic 2}
   3. {Epic 3}

   Run `/epic` to define these in detail."

## Approval Flow

After generating the PRD draft:
- Present the PRD content to user
- Ask: "Would you like me to also create visual diagrams? I can generate:
  - Architecture diagram
  - User flow diagrams
  - Data model (ERD)
  - Wireframes
  - State machine diagrams"
- Options: "approve", "refine <feedback>", "expand <section>", "add diagrams", "restart"

**On approve with diagrams:**
1. Save the main PRD file
2. Generate requested diagram files to `{folderPath}/`
3. Register each as a supporting document:
   ```
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {"fileName": "architecture.md", "filePath": "{folderPath}/architecture.md", "documentType": "DESIGN"}
   {"fileName": "user-flows.md", "filePath": "{folderPath}/user-flows.md", "documentType": "DESIGN"}
   {"fileName": "wireframes.md", "filePath": "{folderPath}/wireframes.md", "documentType": "WIREFRAME"}
   {"fileName": "data-model.md", "filePath": "{folderPath}/data-model.md", "documentType": "DESIGN"}
   ```
4. Update status: PUT /api/projects/{projectRef}/prds/{prdRef} {"status": "IN_REVIEW"}

## Adding Supporting Documents

If user provides or requests additional documents:
1. Save file to `{folderPath}/{filename}`
2. Register via API:
   ```
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {"fileName": "{filename}", "filePath": "{path}", "documentType": "{type}"}
   ```

Document types: PRD, WIREFRAME, MOCKUP, DESIGN, OTHER

## Diagram Guidelines

When creating diagrams:
- **Keep it simple** - Focus on key concepts, not every detail
- **Use Mermaid** - All diagrams should use Mermaid syntax for rendering
- **Be consistent** - Use same naming conventions as the PRD
- **Add explanations** - Each diagram should have text explaining what it shows
- **Link to PRD** - Reference specific PRD sections the diagram illustrates
