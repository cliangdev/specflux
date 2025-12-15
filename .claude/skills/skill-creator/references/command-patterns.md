# Command Patterns for SpecFlux

Guidelines for creating slash commands that interact with SpecFlux API.

## Command Structure

Every command should follow this structure:

```markdown
# /command-name - Short Description

One-line description of what the command does.

**Skill**: Reference relevant skills.

## Usage
\`\`\`
/command-name <arguments>
\`\`\`

## Process
1. **Fetch Context** - Get data from API
2. **Validate/Clarify** - Ask questions if needed
3. **Execute** - Do the work
4. **Verify** - Confirm requirements are met
5. **Complete** - Update status, create artifacts

## Example Session
\`\`\`
> /command-name arg1
[Show realistic example of command execution]
\`\`\`
```

## Critical Patterns

### 1. Requirements Traceability

Commands that create work items (epics, tasks) MUST:

- **Extract requirements inventory** - List every requirement from source document
- **Include PRD line references** - Link tasks to specific PRD lines (e.g., "PRD lines 384-388")
- **Build coverage matrix** - Map every requirement to epic/task before creating

Example:
```
| # | Requirement              | PRD Line | Epic | Task |
|---|--------------------------|----------|------|------|
| 1 | Add Epics section        | 384-388  | E2   | T2.1 |
| 2 | Progress bar in epic row | 386      | E2   | T2.1 |
```

### 2. Verification Before Completion

Commands that complete work items MUST:

- **Re-read acceptance criteria** - Don't rely on memory
- **Check PRD reference** - If task has PRD lines, re-read them
- **Present verification checklist** - Show user what was verified
- **Get user confirmation** - Before marking COMPLETED

Example verification output:
```
## Task Verification

### Acceptance Criteria
- [x] AC1: Add Epics section → PRDDetailPage.tsx:145-180
- [ ] AC2: "+ Add" button → NOT IMPLEMENTED

### PRD Reference (lines 384-388)
- [x] Epic rows with progress → EpicRow.tsx
- [ ] "+ Add" button → MISSING

### Gaps Found
- Missing "+ Add" button

Fix gaps before marking complete? (y/n)
```

### 3. Granular Work Items

- **One task = one specific change** (not "refactor entire page")
- **Include specific PRD line references** in task descriptions
- **Extract acceptance criteria directly from PRD** - don't summarize
- **Add verification task** at end of each epic

Bad: "Refactor PRD Detail Page"
Good: "Add Epics section with progress bars to PRD Detail Page (PRD lines 384-388)"

### 4. Progressive Context Loading

- Fetch PRD documents at start for reference
- Store PRD line references for later verification
- Re-read relevant sections during verification (don't rely on earlier context)

## Command Checklist

Before finalizing a command, verify:

- [ ] Has clear process steps with numbered phases
- [ ] Includes verification step before completion
- [ ] References PRD/source documents for traceability
- [ ] Shows realistic example session
- [ ] Example shows verification output
- [ ] Lists recommended skills to activate
- [ ] Uses API endpoints correctly (GET for fetch, PUT/PATCH for update)

## Anti-Patterns to Avoid

1. **Skipping verification** - Always verify before marking complete
2. **Vague task titles** - Be specific about what changes
3. **Summarizing requirements** - Copy specific criteria from PRD
4. **Marking complete without user confirmation** - Always ask
5. **Trusting earlier context** - Re-read PRD during verification
6. **Batch marking complete** - Verify each item individually
