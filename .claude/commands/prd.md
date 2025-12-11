# /prd - Create or Refine Product Specification

Help the user create or refine a product specification document.

**Skill**: Use `specflux-api` skill for API reference.

## Process

1. **Check for Existing PRDs**
   - Fetch via API: GET /api/projects/{projectRef}/prds
   - If found: List them and ask "Want to refine an existing PRD or create a new one?"
   - If none: Start fresh with a new PRD

2. **Interview** (ask one question at a time, conversationally):

   | Phase | Question |
   |-------|----------|
   | **Problem** | "What are you building? What problem does it solve?" |
   | **Users** | "Who has this problem? Primary and secondary users?" |
   | **User Stories** | "What should users be able to do? Give me 2-3 user stories (As a X, I want Y, so that Z)" |
   | **Features** | "List 3-5 core features for MVP" |
   | **Wireframes** | "Describe the main screen layout - what does the user see first? What are the key UI components?" |
   | **Interactions** | "Walk me through the primary user flow - what happens step by step when a user does the main action?" |
   | **Tech** | "Any technical constraints or preferences? (languages, frameworks, integrations)" |
   | **Scope** | "What's explicitly NOT in MVP?" |

3. **Validate Before Generating**

   Before generating the PRD, ensure minimum content:
   - Problem statement is clear
   - At least 2 user stories
   - At least 3 core features
   - At least 1 wireframe/layout description
   - At least 1 interaction flow
   - Tech stack preferences (or confirm defaults)

   If missing, ask follow-up questions for that section.

4. **Generate PRD Files**

   Create three files in the PRD folder:

   ### prd.md (Core - Keep Concise, 1-2 pages)

   ```markdown
   # {Project Name}

   ## Problem Statement
   {Why does this need to exist? Who has this problem?}

   ## Target Users
   - Primary: {who}
   - Secondary: {who}

   ## User Stories
   1. As a {user}, I want to {action}, so that {benefit}
   2. As a {user}, I want to {action}, so that {benefit}
   3. As a {user}, I want to {action}, so that {benefit}

   ## Core Features (MVP)
   ### Feature 1: {Name}
   - {Capability}

   ### Feature 2: {Name}
   - {Capability}

   ### Feature 3: {Name}
   - {Capability}

   ## Tech Stack
   - Frontend: {framework}
   - Backend: {framework}
   - Database: {type}

   ## Out of Scope
   - {Feature explicitly not in MVP}

   ## Success Metrics
   - {Measurable outcome}

   ## Supporting Documents
   - [Wireframes](./wireframes.md)
   - [Key Interactions](./interactions.md)
   ```

   ### wireframes.md

   ```markdown
   # Wireframes

   ## Main Layout
   +------------------+------------------------+
   | Sidebar          | Main Content           |
   | - Nav Item 1     |                        |
   | - Nav Item 2     | {Page content here}    |
   +------------------+------------------------+

   ## Screen: {Name}
   {ASCII layout or detailed description}

   ## Screen: {Name}
   {ASCII layout or detailed description}
   ```

   ### interactions.md

   Use mermaid diagrams for user flows:

   ````markdown
   # Key Interactions

   ## {Primary Flow Name}

   ```mermaid
   flowchart TD
       A[{Start action}] --> B[{Next step}]
       B --> C{Decision point?}
       C -->|Yes| D[{Success path}]
       C -->|No| E[{Error handling}]
       E --> B
   ```

   ## {Secondary Flow Name}

   ```mermaid
   flowchart TD
       A[{Start}] --> B[{Step}]
       B --> C[{End}]
   ```
   ````

5. **Create PRD via API**
   ```
   POST /api/projects/{projectRef}/prds
   {"title": "{prd-name}", "description": "{brief summary}"}
   ```
   This returns the PRD with auto-generated folderPath (e.g., `.specflux/prds/{slug}`)

6. **Save All Files** to the returned folderPath:
   - Save to `{folderPath}/prd.md`
   - Save to `{folderPath}/wireframes.md`
   - Save to `{folderPath}/interactions.md`

7. **Register All Documents via API**

   Register the primary PRD document:
   ```
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {
     "fileName": "prd.md",
     "filePath": "{folderPath}/prd.md",
     "documentType": "PRD",
     "isPrimary": true
   }
   ```

   Register wireframes:
   ```
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {
     "fileName": "wireframes.md",
     "filePath": "{folderPath}/wireframes.md",
     "documentType": "WIREFRAME"
   }
   ```

   Register interactions (as design document):
   ```
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {
     "fileName": "interactions.md",
     "filePath": "{folderPath}/interactions.md",
     "documentType": "DESIGN"
   }
   ```

8. **Suggest Epics**:
   "I've identified these potential epics from your PRD:
   1. {Epic 1} - from user story or feature
   2. {Epic 2} - from user story or feature
   3. {Epic 3} - from user story or feature

   Run `/epic {name}` to define any of these in detail."

## Approval Flow

After generating the PRD draft:
- Show all three files for review
- Ask user to review
- Options: "approve", "refine <feedback>", "expand <section>", "restart"
- On approve: Save files and register via API
- Update status: PUT /api/projects/{projectRef}/prds/{prdRef} {"status": "APPROVED"}
- Optionally offer to create GitHub PR for team review

## /prd refine - Analyze and Fill Gaps

For existing or imported PRDs:

1. **Analyze** - Read existing PRD files from folder
2. **Compare against template** - Check for required sections
3. **Report gaps**:
   ```
   Found:
   ✓ Problem Statement
   ✓ Target Users
   ✓ Core Features
   ✗ Wireframes (missing)
   ✗ Key Interactions (missing)
   ○ User Stories (only 1, recommend 3+)
   ```
4. **Guided fill** - Ask questions only for missing/weak sections
5. **Merge** - Update files with new content
6. **Review** - Show updated PRD for approval

## Adding Supporting Documents

If user provides additional wireframes, mockups, or other documents:
1. Save file to `{folderPath}/{filename}` or `{folderPath}/mockups/{filename}`
2. Register via API:
   ```
   POST /api/projects/{projectRef}/prds/{prdRef}/documents
   {"fileName": "{filename}", "filePath": "{path}", "documentType": "WIREFRAME|MOCKUP|DESIGN|OTHER"}
   ```

Document types: PRD, WIREFRAME, MOCKUP, DESIGN, OTHER

## Validation Checklist

Before saving, verify:
- [ ] Problem statement clearly explains the "why"
- [ ] At least 2 user stories in proper format
- [ ] At least 3 core features defined
- [ ] Wireframes describe at least the main screen
- [ ] At least 1 user flow documented with mermaid
- [ ] Tech stack specified (or defaults confirmed)
- [ ] Out of scope section present
