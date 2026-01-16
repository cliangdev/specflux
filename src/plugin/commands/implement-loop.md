---
description: Start autonomous implementation loop for all tasks matching a PRD tag
argument-hint: --tag <tag> [--max-iterations <n>]
---

# /specflux:implement-loop - Autonomous Implementation Loop

Start an autonomous implementation loop for all tasks matching a PRD tag. Claude implements tasks continuously without user interaction until complete or max iterations reached.

**Skills**: Use `specflux-api` for API operations. The `specflux-coding` skill automatically activates for each task.

## Prerequisites Check (REQUIRED)

**Before making any API calls, verify the SpecFlux API environment is configured.**

```bash
echo "SPECFLUX_API_URL: ${SPECFLUX_API_URL:-NOT SET}"
echo "SPECFLUX_API_KEY: ${SPECFLUX_API_KEY:+SET (hidden)}"
echo "SPECFLUX_PROJECT_REF: ${SPECFLUX_PROJECT_REF:-NOT SET}"
```

If any variable is NOT SET, see the `specflux-api` skill for setup instructions. Do not proceed until configured.

## Usage

```
/specflux:implement-loop --tag <tag> [--max-iterations <n>]
```

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `--tag <tag>` | PRD tag to filter tasks | Yes | - |
| `--max-iterations <n>` | Safety limit for iterations | No | 100 |

## Examples

```bash
# Implement all tasks tagged with "mvp-phase1"
/specflux:implement-loop --tag mvp-phase1

# Limit to 50 iterations
/specflux:implement-loop --tag auth-features --max-iterations 50
```

## Process

### 1. Parse Arguments

Extract from command arguments:
- `--tag` (required) - Error if not provided
- `--max-iterations` (optional, default: 100)

```
ARGUMENTS: --tag mvp-phase1 --max-iterations 50

tag = "mvp-phase1"
max_iterations = 50
```

**Validation:**
- If `--tag` is missing: Error "Tag is required. Usage: /specflux:implement-loop --tag <tag>"
- If tag is empty: Error "Tag cannot be empty"

### 2. Query for Implementable Tasks

```bash
GET /api/projects/{projectRef}/tasks?prdTag={tag}&statusNot=COMPLETED,CANCELLED
```

**If no tasks found:**
> "No implementable tasks found for tag '{tag}'. All tasks may be complete or cancelled."

**If tasks found:**
Display count and first task:
> "Found {n} implementable tasks for tag '{tag}'. Starting with {taskRef}: {taskTitle}"

### 3. Create State File

Create state file at `.specflux/tmp/loop-{tag}.local.md`:

```yaml
---
active: true
tag: "{tag}"
max_iterations: {max_iterations}
iteration: 1
current_prd_ref: null
started_at: "{ISO8601 timestamp}"
---
```

**Directory setup:**
```bash
mkdir -p .specflux/tmp
```

**Important:** The `.specflux/tmp/` directory should be gitignored.

### 4. Start First Task Implementation

Fetch the first task details and acceptance criteria:

```bash
GET /api/projects/{projectRef}/tasks/{taskRef}
GET /api/projects/{projectRef}/tasks/{taskRef}/acceptance-criteria
```

Update state file with current PRD ref:
```yaml
current_prd_ref: "{task's PRD ref}"
```

### 5. Hand Off to Implementation

Output the implementation prompt and exit. The Stop Hook will intercept the exit and continue the loop.

**Implementation Prompt:**
```
## Your Task
Implement task {taskRef}: {taskTitle}

## Task Details
{task description from API}

## Acceptance Criteria
{criteria list from API}

## Rules
- Follow specflux-coding skill (tests first, one commit per task)
- Mark each criterion complete via API when done
- Update task status to COMPLETED when all criteria pass
- If blocked, mark task BLOCKED with reason, then exit to continue to next task
- Do NOT ask questions - if unclear, mark BLOCKED and move on
```

---

## How the Loop Works

```
/specflux:implement-loop --tag mvp-phase1
         │
         ▼
┌─────────────────────────────────────────────┐
│  1. Parse args, validate tag                │
│  2. Query API for implementable tasks       │
│  3. Create .specflux/tmp/loop-{tag}.local.md│
│  4. Fetch first task details                │
│  5. Output implementation prompt            │
│  6. Exit                                    │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Stop Hook Intercepts Exit                  │
│  - Reads state file                         │
│  - Increments iteration                     │
│  - Queries for next task                    │
│  - Blocks exit, feeds next task prompt      │
└─────────────────────────────────────────────┘
         │
         ▼
    (Loop continues until no tasks or max iterations)
```

---

## State File Location

**Pattern:** `.specflux/tmp/loop-{tag}.local.md`

**Examples:**
- `.specflux/tmp/loop-mvp-phase1.local.md`
- `.specflux/tmp/loop-auth-features.local.md`

The tag is embedded in the filename so multiple loops can be identified. The `.local.md` extension ensures it's gitignored.

---

## Error Handling

| Error | Handling |
|-------|----------|
| Tag not provided | Display usage, do not create state file |
| No tasks found | Inform user, do not create state file |
| API unreachable | Stop, inform user to check configuration |
| State file already exists | Warn user, ask to cancel existing loop first |

**Existing loop check:**
```bash
if [ -f ".specflux/tmp/loop-{tag}.local.md" ]; then
  echo "Loop already active for tag '{tag}'. Run /specflux:cancel-loop --tag {tag} first."
  exit 1
fi
```

---

## Cancelling a Loop

To stop a running loop:
```
/specflux:cancel-loop --tag {tag}
```

See `cancel-loop.md` for details.
