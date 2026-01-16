---
description: Stop a running implementation loop
argument-hint: [--tag <tag>]
---

# /specflux:cancel-loop - Cancel Implementation Loop

Stop a running implementation loop by deleting its state file. The next time Claude tries to exit, the Stop Hook will allow it.

## Usage

```
/specflux:cancel-loop [--tag <tag>]
```

| Parameter | Description | Required |
|-----------|-------------|----------|
| `--tag <tag>` | Cancel loop for specific tag | No |

## Examples

```bash
# Cancel a specific loop
/specflux:cancel-loop --tag mvp-phase1

# Cancel any active loop (if only one exists)
/specflux:cancel-loop
```

## Process

### 1. Find State Files

**With `--tag` specified:**
Look for `.specflux/tmp/loop-{tag}.local.md`

**Without `--tag`:**
Look for any `.specflux/tmp/loop-*.local.md` files

```bash
# With tag
STATE_FILE=".specflux/tmp/loop-{tag}.local.md"

# Without tag
STATE_FILES=$(ls .specflux/tmp/loop-*.local.md 2>/dev/null)
```

### 2. Handle Results

**No state file found:**
> "No active loop found{for tag '{tag}'}. Nothing to cancel."

**Multiple state files found (no tag specified):**
> "Multiple active loops found:
> - loop-mvp-phase1.local.md
> - loop-auth-features.local.md
>
> Specify --tag to cancel a specific loop."

**Single state file found:**
Continue to step 3.

### 3. Read State Before Deletion

Parse the YAML frontmatter to extract:
- `tag` - The loop tag
- `iteration` - Current iteration count
- `started_at` - When the loop started

```yaml
---
active: true
tag: "mvp-phase1"
max_iterations: 100
iteration: 47
current_prd_ref: "SPEC-P3"
started_at: "2026-01-14T10:00:00Z"
---
```

### 4. Delete State File

```bash
rm ".specflux/tmp/loop-{tag}.local.md"
```

### 5. Report Cancellation

Calculate duration from `started_at` to now.

**Output:**
```
Loop cancelled for tag '{tag}'.

Progress at cancellation:
  Iterations: {iteration}
  Duration: {duration}

The next exit attempt will succeed.
To resume: /specflux:implement-loop --tag {tag}
```

---

## State File Location

**Pattern:** `.specflux/tmp/loop-{tag}.local.md`

The tag is embedded in the filename, making it easy to identify and delete specific loops.

---

## Error Handling

| Scenario | Response |
|----------|----------|
| No state files exist | Inform user, no action needed |
| Multiple loops, no tag | List all, ask user to specify |
| File deletion fails | Error with file path, suggest manual deletion |

---

## Interaction with Stop Hook

The Stop Hook checks for state files before blocking exit:

1. User runs `/specflux:cancel-loop --tag mvp-phase1`
2. State file `.specflux/tmp/loop-mvp-phase1.local.md` is deleted
3. Claude finishes current task and tries to exit
4. Stop Hook sees no state file for this tag
5. Stop Hook allows exit (returns `{"decision": "allow"}`)
6. Loop ends

---

## Quick Reference

```bash
# Cancel specific loop
/specflux:cancel-loop --tag mvp-phase1

# Cancel any loop (single active)
/specflux:cancel-loop

# Check if loop is active
ls .specflux/tmp/loop-*.local.md
```
