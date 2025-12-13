# /epic - Break Down PRD into Epics and Tasks

Transform a PRD into actionable epics and tasks ready for AI implementation.

**Skill**: Use `specflux-api` skill for all API operations.

## Context from Environment

The terminal session provides context via environment variables:
- `SPECFLUX_PROJECT_REF` - Project reference for API calls
- `SPECFLUX_CONTEXT_TYPE` - Current context type (e.g., "prd-workshop")
- `SPECFLUX_CONTEXT_ID` - Current context ID (e.g., PRD ID)
- `SPECFLUX_CONTEXT_DISPLAY_KEY` - Human-readable key (e.g., "SPEC-P1")

Use these to automatically determine which project/PRD you're working with.

## Process

### Phase 1: Understand the PRD

1. **Get context from environment**, then fetch PRD:
   ```
   # projectRef from $SPECFLUX_PROJECT_REF
   # prdRef from $SPECFLUX_CONTEXT_ID (if context type is prd-workshop)
   GET /api/projects/{projectRef}/prds/{prdRef}
   GET /api/projects/{projectRef}/prds/{prdRef}/documents
   ```

2. **Read all documents** - primary PRD and supporting files (wireframes, mockups)

3. **Extract requirements inventory** - Create a numbered list of EVERY requirement:
   - For UI PRDs: Parse each wireframe section, extract every element shown
   - For API PRDs: Extract every endpoint, field, validation rule
   - For feature PRDs: Extract every user story, business rule, edge case
   - **Reference line numbers** from PRD for traceability (e.g., "PRD lines 364-413")

4. **Clarify ambiguities** - Ask about unclear requirements, scope, integrations. Don't proceed until you have clear answers.

### Phase 2: Design Epics

1. **Break PRD into epics** by feature domain, user journey, or technical layer

2. **Order by dependencies** - Create independent epics FIRST, then dependent ones

3. **Write self-contained epic descriptions** - AI should be able to code from the epic alone:
   - Context & user stories
   - Scope (what's IN and OUT)
   - Technical approach & data model
   - API contracts
   - Edge cases

4. **Add high-level acceptance criteria (3-5)** focused on outcomes:
   - Good: "Users can complete purchase end-to-end in under 2 minutes"
   - Bad: "API returns 200" (too low-level, belongs in tasks)

### Phase 3: Create Epics via API

```
POST /api/projects/{projectRef}/epics
{ "title": "...", "description": "...", "prdRef": "..." }

POST /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
{ "criteria": "..." }

POST /api/projects/{projectRef}/epics/{epicRef}/dependencies
{ "dependsOnEpicRef": "..." }
```

### Phase 4: Create Tasks

1. **Break each epic into 1-4 hour tasks** - One task = one specific change, NOT "refactor entire page"

2. **Write immediately actionable task descriptions**:
   - Objective (one sentence, specific outcome)
   - Files to create/modify
   - Implementation details (endpoints, schemas, validation)
   - Error handling
   - **PRD reference** (e.g., "See wireframe lines 384-388")

3. **Extract acceptance criteria DIRECTLY from PRD** - Don't summarize, copy specific requirements:
   - For UI: Each visual element in wireframe = one criterion
   - For API: Each field, validation, response code = one criterion
   - **Include PRD line reference** for traceability
   - Example: `[UI] Epics section shows: key, title, status badge, progress bar (PRD line 386)`

4. **Add verifiable test criteria**:
   - `[Unit]` "hashPassword returns bcrypt hash with cost 12"
   - `[Integration]` "POST /auth/register returns 201 for valid input"
   - `[E2E]` "User completes registration and sees welcome message"

5. **Add verification task per epic** - Final task should be "Verify implementation matches PRD wireframe/spec"

```
POST /api/projects/{projectRef}/tasks
{ "epicRef": "...", "title": "...", "description": "...", "priority": "HIGH|MEDIUM|LOW" }

POST /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
{ "criteria": "..." }

POST /api/projects/{projectRef}/tasks/{taskRef}/dependencies
{ "dependsOnTaskRef": "..." }
```

### Phase 5: Verify Coverage

**CRITICAL: Do not skip this phase. This prevents incomplete implementations.**

1. **Build requirement traceability matrix** - Map EVERY requirement from Phase 1 inventory:
   ```
   | # | Requirement (from PRD)              | PRD Line | Epic   | Task(s)  | Status |
   |---|-------------------------------------|----------|--------|----------|--------|
   | 1 | PRD Detail: Add Epics section       | 384-388  | E36    | T185     | ✓      |
   | 2 | PRD Detail: AIActionButton in header| 370      | E36    | T186     | ✓      |
   | 3 | Roadmap: Split-panel layout         | 560-584  | E37    | T189-190 | ✓      |
   ```

2. **Verify 100% coverage** - Every row must have Epic + Task mapping

3. **Flag gaps** - If any requirement lacks task coverage, create additional tasks

4. **Present to user** - Show the complete matrix, get explicit approval before creating in API

5. **Include verification tasks** - Each epic should end with "Verify against PRD lines X-Y"

## Example: API PRD

```
> /epic

Reading PRD "E-commerce MVP" and documents...

## Requirements Inventory (Phase 1)
| #  | Requirement                    | PRD Line | Type     |
|----|--------------------------------|----------|----------|
| 1  | User registration endpoint     | 45-52    | API      |
| 2  | Email validation (format)      | 48       | API      |
| 3  | Password min 8 chars           | 49       | API      |
| 4  | Duplicate email returns 409    | 51       | API      |
| 5  | User login endpoint            | 55-60    | API      |
| 6  | Password reset flow            | 65-80    | API      |
[... 20 more requirements ...]

Questions before proceeding:
1. Payment gateway preference? → Stripe
2. Social login for MVP? → No, email only

## Proposed Epics
[... epic details ...]

## Coverage Matrix (Phase 5)
| #  | Requirement                    | PRD Line | Epic | Task(s) | ✓ |
|----|--------------------------------|----------|------|---------|---|
| 1  | User registration endpoint     | 45-52    | E1   | T1.2    | ✓ |
| 2  | Email validation (format)      | 48       | E1   | T1.2    | ✓ |
| 3  | Password min 8 chars           | 49       | E1   | T1.2    | ✓ |
| 4  | Duplicate email returns 409    | 51       | E1   | T1.2    | ✓ |
| 5  | User login endpoint            | 55-60    | E1   | T1.3    | ✓ |
| 6  | Password reset flow            | 65-80    | E1   | T1.4-5  | ✓ |

All 26 requirements covered. Proceed? → yes
```

## Example: UI PRD with Wireframes

```
> /epic

Reading PRD "Dashboard Redesign" and wireframes...

## Requirements Inventory (Phase 1)
Parsing wireframe sections line by line:

| #  | Requirement                              | PRD Line | Type |
|----|------------------------------------------|----------|------|
| 1  | Header: Back button on own row           | 251      | UI   |
| 2  | Header: Entity key + Title in Row 2      | 252      | UI   |
| 3  | Header: AIActionButton top-right Row 2   | 252      | UI   |
| 4  | Header: Status dropdown in Row 3         | 253      | UI   |
| 5  | PRD Detail: Documents section            | 376-382  | UI   |
| 6  | PRD Detail: Epics section below docs     | 384-388  | UI   |
| 7  | PRD Detail: Epic row shows progress bar  | 386      | UI   |
| 8  | Roadmap: Split-panel layout (240px)      | 560-564  | UI   |
| 9  | Roadmap: Release list in left sidebar    | 566-581  | UI   |
| 10 | Roadmap: Selected release details right  | 564-604  | UI   |
[... etc ...]

## Proposed Epics

**E1: Detail Page Header Redesign**
Tasks:
- T1.1: Add back button to own row (PRD line 251)
- T1.2: Add AIActionButton to header Row 2 (PRD line 252)
- T1.3: Move status to Row 3 (PRD line 253)
- T1.4: Verify header matches PRD wireframe lines 241-260

**E2: PRD Detail Page Redesign**
Tasks:
- T2.1: Add Epics section below documents (PRD lines 384-388)
  AC: [UI] Shows epic key, title, status badge, progress bar
  AC: [UI] "+ Add" button to create epic for this PRD
- T2.2: Verify PRD Detail matches wireframe lines 364-413

## Coverage Matrix
| #  | Requirement                              | PRD Line | Epic | Task | ✓ |
|----|------------------------------------------|----------|------|------|---|
| 1  | Header: Back button on own row           | 251      | E1   | T1.1 | ✓ |
| 2  | Header: Entity key + Title in Row 2      | 252      | E1   | T1.1 | ✓ |
| 3  | Header: AIActionButton top-right Row 2   | 252      | E1   | T1.2 | ✓ |
| 6  | PRD Detail: Epics section below docs     | 384-388  | E2   | T2.1 | ✓ |
| 7  | PRD Detail: Epic row shows progress bar  | 386      | E2   | T2.1 | ✓ |

All requirements covered. Each epic ends with verification task. Proceed? → yes
```

## Key Principles

1. **Ask first** - Clarify ambiguities before designing
2. **Self-contained** - Epics and tasks include all context needed to code
3. **Independent first** - Create non-dependent epics/tasks before dependent ones
4. **Testable criteria** - Every acceptance criterion is verifiable
5. **No gaps** - 100% PRD coverage verified with traceability matrix before finishing
6. **Line references** - Every task references specific PRD lines for traceability
7. **Granular tasks** - One task = one specific change (not "refactor entire page")
8. **Verification tasks** - Each epic ends with "Verify against PRD lines X-Y"
9. **Extract, don't summarize** - Copy specific requirements from PRD, don't paraphrase
