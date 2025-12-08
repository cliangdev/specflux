# /prd - Create or Refine Product Specification

Help the user create or refine a product specification document.

**Skill**: Use `specflux-api` skill for API reference.

## Context from Environment

The terminal session provides context via environment variables:
- `SPECFLUX_PROJECT_REF` - Project reference for API calls (e.g., "SPEC")
- `SPECFLUX_CONTEXT_TYPE` - Current context type (e.g., "prd-workshop")
- `SPECFLUX_CONTEXT_REF` - Context reference for API calls (e.g., "SPEC-P1" if editing existing)

Use these to automatically determine which project you're working with.

## Process

1. **Check for Existing PRDs**
   - Fetch via API: GET /api/projects/{projectRef}/prds
   - If found: List them and ask "Want to refine an existing PRD or create a new one?"
   - If none: Start fresh with a new PRD

2. **Interview** (ask one question at a time, conversationally):
   - What are you building? (if not already provided)
   - What problem does it solve? Who has this problem?
   - What's the simplest version that would be useful?
   - List 3-5 core features for MVP
   - Any technical constraints or preferences?

3. **Generate PRD** using this structure:

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

## Out of Scope (for now)
- {Feature that's explicitly not in MVP}

## Technical Constraints
- {Platform, language, integration requirements}

## Success Metrics
- {How do we know this is working?}
```

4. **Create PRD via API**
   ```
   POST /api/projects/{projectRef}/prds
   {"title": "{prd-name}", "description": "{brief summary}"}
   ```
   This returns the PRD with auto-generated folderPath (e.g., `.specflux/prds/{slug}`)

5. **Save Markdown File** to the returned folderPath:
   - Save to `{folderPath}/prd.md`

6. **Register Document via API**
   ```
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {
     "fileName": "prd.md",
     "filePath": "{folderPath}/prd.md",
     "documentType": "PRD",
     "isPrimary": true
   }
   ```

7. **Suggest Epics**:
   "I've identified these potential epics from your PRD:
   1. {Epic 1}
   2. {Epic 2}
   3. {Epic 3}

   Run `/epic {name}` to define any of these in detail."

## Approval Flow

After generating the PRD draft:
- Ask user to review
- Options: "approve", "refine <feedback>", "expand <section>", "restart"
- On approve: Save file and register via API
- Update status: PUT /api/projects/{projectRef}/prds/{prdRef} {"status": "APPROVED"}
- Optionally offer to create GitHub PR for team review

## Adding Supporting Documents

If user provides wireframes, mockups, or other documents:
1. Save file to `{folderPath}/{filename}`
2. Register via API:
   ```
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {"fileName": "{filename}", "filePath": "{path}", "documentType": "WIREFRAME"}
   ```

Document types: PRD, WIREFRAME, MOCKUP, DESIGN, OTHER
