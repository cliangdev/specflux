# Command Patterns for SpecFlux

Guidelines for creating slash commands that interact with SpecFlux API.

## Command Structure

Every command should follow this structure:

```markdown
# /command-name - Short Description

One-line description of what the command does.

**Skill**: Reference relevant skills (e.g., `specflux-api`).

## Context from Environment

The terminal session provides context via environment variables:
- `SPECFLUX_PROJECT_REF` - Project reference for API calls (e.g., "SPEC")
- `SPECFLUX_CONTEXT_TYPE` - Current context type (e.g., "epic", "task", "prd")
- `SPECFLUX_CONTEXT_REF` - Context reference (e.g., "SPEC-E1", "SPEC-42")

Use these to automatically determine context.

## Usage
\`\`\`
/command-name [ref]
\`\`\`

- Without argument: Uses current context from environment
- With argument: Overrides with specific ref

## Process

### Phase 1: Understand Context
- Fetch entities and documents from API
- Read ALL associated documents (PRD, wireframes, mockups)
- Check current state and progress

### Phase 2: Plan/Validate
- Identify dependencies and order
- Ask clarifying questions if needed
- Map requirements to work items

### Phase 3: Execute
- Do the work (implementation, creation, etc.)
- Update status via API as you progress

### Phase 4: Verify
- Check ALL acceptance criteria are met
- Re-read PRD/source documents
- Present verification checklist

### Phase 5: Complete
- Update final status
- Create artifacts (PR, commit, etc.)

## Example Session
\`\`\`
> /command-name SPEC-E1

📋 Fetching context...
📄 Reading documents...
📊 Current progress: X/Y completed

[Execution steps with status updates...]

✅ Verification:
- [x] All criteria met
- [x] Tests passing

Done! Ready for review.
\`\`\`
```

## Critical Patterns

### 1. Context-Aware Commands

Commands should detect scope from environment variables:

```markdown
| Context Type | Scope |
|--------------|-------|
| `release` | All epics in release |
| `prd` | All epics linked to PRD |
| `epic` | Epic and its tasks |
| `task` | Single task only |
```

Fetch appropriate data based on context:
```bash
# For epic context
GET /api/projects/{projectRef}/epics/{epicRef}
GET /api/projects/{projectRef}/epics/{epicRef}/acceptance-criteria
GET /api/projects/{projectRef}/tasks?epicRef={epicRef}

# For task context
GET /api/projects/{projectRef}/tasks/{taskRef}
GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
```

### 2. Document Reading Before Implementation

**ALWAYS** read all associated documents before starting work:

```bash
# Get document list from PRD
GET /api/projects/{projectRef}/prds/{prdRef}/documents

# Documents are stored at: {project.localPath}/{document.filePath}
# Read each: PRD, wireframes, mockups, design docs
```

Understanding requirements prevents rework and ensures accuracy.

### 3. Requirements Traceability

Commands that create work items MUST:

- **Extract requirements inventory** - List every requirement from source
- **Include PRD line references** - Link tasks to specific lines
- **Build coverage matrix** - Map every requirement to epic/task

```
| # | Requirement | PRD Line | Epic | Task |
|---|-------------|----------|------|------|
| 1 | Profile settings UI | 384-388 | E2 | T2.1 |
| 2 | Avatar upload | 386 | E2 | T2.2 |
```

### 4. One Task = One Git Commit

For implementation commands:

- Each task should result in a standalone commit
- Include tests for critical components
- Verify acceptance criteria before committing
- Use descriptive commit messages with task ref

```bash
git commit -m "feat(SPEC-42): <task title>

- <implementation details>
- <tests added>

Acceptance Criteria:
- [x] <criterion 1>
- [x] <criterion 2>

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 5. Status Updates Throughout

Update status via API as work progresses:

```bash
# Start work
PATCH /api/projects/{projectRef}/tasks/{taskRef}
{"status": "IN_PROGRESS"}

# Mark criteria met
PUT /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria/{id}
{"isMet": true}

# Complete task
PATCH /api/projects/{projectRef}/tasks/{taskRef}
{"status": "COMPLETED"}
```

### 6. Verification Before Completion

Commands that complete work items MUST:

- **Re-read acceptance criteria** - Don't rely on memory
- **Check PRD reference** - Re-read source lines
- **Run tests** - Ensure no regressions
- **Present verification checklist** - Show what was verified
- **Get user confirmation** - Before marking COMPLETED

```
## Verification

### Task Acceptance Criteria
- [x] AC1: Profile table migration → V001__profiles.sql
- [x] AC2: Repository with CRUD → ProfileRepository.java
- [x] AC3: Unit tests → ProfileRepositoryTest.java

### Epic Acceptance Criteria
- [x] Users can update profile → ProfileService tested
- [x] Avatar upload works → S3Service integrated

### Tests
- [x] Unit tests passing (15/15)
- [x] Integration tests passing (8/8)

All criteria verified. Mark epic COMPLETED? (y/n)
```

### 7. Test Requirements

For implementation commands, add tests for:

- **Business logic** - Unit tests for services/utilities
- **API endpoints** - Integration tests for controllers
- **UI components** - Component tests for critical UI
- **Edge cases** - Tests for scenarios in acceptance criteria

Don't skip tests for critical components.

### 8. Granular Work Items

- **One task = one specific change** (not "refactor entire page")
- **Include specific PRD line references** in task descriptions
- **Extract acceptance criteria directly from PRD** - don't summarize
- **Add verification task** at end of each epic

Bad: "Refactor PRD Detail Page"
Good: "Add Epics section with progress bars (PRD lines 384-388)"

## Command Checklist

Before finalizing a command, verify:

- [ ] Uses environment variables for context detection
- [ ] Has clear phased process (Understand → Plan → Execute → Verify → Complete)
- [ ] Includes document reading phase before implementation
- [ ] Shows status updates via API throughout
- [ ] Has verification step with acceptance criteria check
- [ ] References PRD/source documents for traceability
- [ ] Shows realistic example session with progress indicators
- [ ] Lists recommended skills to activate
- [ ] Uses correct API methods (GET for fetch, PUT/PATCH for update)

## Anti-Patterns to Avoid

1. **Skipping document reading** - Always read PRD/wireframes first
2. **Skipping verification** - Always verify before marking complete
3. **Large commits** - One task = one commit
4. **Skipping tests** - Add tests for critical components
5. **Vague task titles** - Be specific about what changes
6. **Summarizing requirements** - Copy specific criteria from PRD
7. **Marking complete without checks** - Verify criteria are met
8. **Trusting earlier context** - Re-read during verification
9. **Ignoring status updates** - Keep API status in sync with reality
