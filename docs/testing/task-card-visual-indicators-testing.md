# Manual Testing Checklist: Task Card Visual Indicators

## Prerequisites
- [ ] Backend server running (`npm run dev` in orchestrator/)
- [ ] Frontend app running (`npm run tauri dev` in frontend/)
- [ ] At least one project created with multiple tasks

**Note:** Dependency management UI is not yet implemented. To test blocked indicators, you'll need to create dependencies via:
- **Option A:** API calls (see "Creating Dependencies via API" section below)
- **Option B:** Direct database inserts (see "Creating Dependencies via Database" section below)

---

## 1. Dynamic Repository Colors

### Test: Repository colors are deterministic
- [ ] Create/view tasks with repo name "backend"
- [ ] All "backend" tasks should have the **same color** badge
- [ ] Create/view tasks with repo name "frontend"
- [ ] All "frontend" tasks should have a **different color** from "backend"
- [ ] Verify colors are distinct and readable in both light/dark mode

### Test: Multiple repositories
- [ ] Create tasks for different repos: backend, frontend, orchestrator, docs
- [ ] Each repo should have a unique, consistent color
- [ ] Colors should cycle through: blue, purple, emerald, amber, rose, cyan, indigo, teal

### Test: Missing repo name
- [ ] Create a task without a repo name
- [ ] Should show no repo badge (or default slate color)

---

## 2. Agent Status Icons

### Test: Idle status
- [ ] Create a new task (default status is idle)
- [ ] Should show **dashed circle icon** in slate/gray color
- [ ] Hover over icon, tooltip should say "Idle"
- [ ] No "Running" text should appear

### Test: Running status
- [ ] Start an agent for a task
- [ ] Should show **pulsing dot** in brand-blue color
- [ ] Should show "Running" text next to icon
- [ ] Icon should animate (pulse effect)

### Test: Paused status
- [ ] Pause a running agent
- [ ] Should show **pause icon** (two vertical bars) in amber color
- [ ] Hover over icon, tooltip should say "Paused"
- [ ] No "Running" text should appear

### Test: Stopped status
- [ ] Stop a running agent
- [ ] Should show **square icon** in slate/gray color
- [ ] Hover over icon, tooltip should say "Stopped"

### Test: Completed status
- [ ] Complete a task (agent finishes successfully)
- [ ] Should show **checkmark icon** in emerald/green color
- [ ] Hover over icon, tooltip should say "Completed"

### Test: Failed status
- [ ] Have an agent fail (or manually set agentStatus to failed)
- [ ] Should show **x-circle icon** in red color
- [ ] Hover over icon, tooltip should say "Failed"

---

## 3. Blocked Indicator with Count

### Test: Unblocked task
- [ ] Create a task with no dependencies
- [ ] Should **NOT** show lock icon or blocked badge
- [ ] Task card border should be normal (gray/slate)

### Test: Task blocked by 1 incomplete task
- [ ] Create Task A (mark as "Backlog")
- [ ] Create Task B that depends on Task A
- [ ] Task B should show **lock icon + "1"** in amber badge
- [ ] Hover over badge, tooltip should say "Blocked by 1 incomplete task"
- [ ] Task card border should be amber

### Test: Task blocked by multiple incomplete tasks
- [ ] Create Task A, Task B (both in "Backlog")
- [ ] Create Task C that depends on both A and B
- [ ] Task C should show **lock icon + "2"** in amber badge
- [ ] Hover over badge, tooltip should say "Blocked by 2 incomplete tasks"

### Test: Task becomes unblocked
- [ ] Using previous test (Task C blocked by A and B)
- [ ] Complete Task A (move to "Done")
- [ ] Task C should now show **lock icon + "1"** (only blocked by B)
- [ ] Complete Task B (move to "Done")
- [ ] Task C should **NOT** show blocked badge anymore
- [ ] Verify blockedByCount updates in real-time (may need to refresh)

### Test: Dependency on approved task
- [ ] Create Task X (mark as "Approved")
- [ ] Create Task Y that depends on X
- [ ] Task Y should **NOT** be blocked (approved counts as complete)

---

## 4. Visual Indicator Combinations

### Test: Running + Has repo + Progress
- [ ] Start agent on a task with repo "backend"
- [ ] Task should show:
  - Pulsing dot + "Running" text
  - Repo badge with consistent color
  - Progress bar at bottom (if progress > 0)

### Test: Blocked + Has repo + Idle
- [ ] Create blocked task with repo name
- [ ] Task should show:
  - Lock icon + count in header
  - Amber border
  - Repo badge at bottom
  - Idle icon (dashed circle)

### Test: Failed + Blocked
- [ ] Have a failed task that is also blocked
- [ ] Should show both:
  - Red x-circle icon (failed status)
  - Lock icon + count (blocked badge)

---

## 5. Dark Mode

### Test: All indicators in dark mode
- [ ] Toggle dark mode in app settings
- [ ] Verify all colors are readable:
  - Repo badges have proper contrast
  - Agent status icons are visible
  - Blocked badge (amber) is clear
  - Progress bar is visible
- [ ] Compare to light mode - all should be legible in both

---

## 6. Drag and Drop

### Test: Visual indicators persist during drag
- [ ] Drag a task with blocked indicator
- [ ] While dragging, indicators should remain visible (slightly transparent)
- [ ] Drop task - indicators should be fully visible again

### Test: Drag blocked task between columns
- [ ] Drag blocked task from Backlog to In Progress
- [ ] Task should keep blocked indicator in new column
- [ ] Status changes but blocked state persists

---

## 7. Performance

### Test: Many tasks with indicators
- [ ] Create 20+ tasks in a project with various states
- [ ] All should have different repo colors, agent statuses
- [ ] Board should load quickly (<2s)
- [ ] Scrolling should be smooth
- [ ] No visual glitches or layout shifts

---

## 8. API Verification (Backend)

### Test: blockedByCount in API response
- [ ] Open browser DevTools Network tab
- [ ] Load board page
- [ ] Inspect `GET /api/projects/:id/tasks` response
- [ ] Verify each task has `blocked_by_count` field (number)
- [ ] Blocked tasks should have `blocked_by_count > 0`
- [ ] Unblocked tasks should have `blocked_by_count: 0`

---

## Edge Cases

### Test: Task with very long repo name
- [ ] Create task with repo name like "very-long-repository-name-test"
- [ ] Repo badge should truncate or wrap appropriately
- [ ] Should not break card layout

### Test: Task blocked by 10+ tasks
- [ ] Create task blocked by many dependencies
- [ ] Should show lock icon + count (e.g., "🔒 12")
- [ ] Count should be readable (not cut off)

### Test: Switching between workflow templates
- [ ] Switch from "startup-fast" to "full-lifecycle"
- [ ] All visual indicators should persist
- [ ] Colors and icons remain consistent

---

## Regression Testing

### Test: Previous features still work
- [ ] Task drag-and-drop between columns works
- [ ] Task titles truncate with hover tooltip
- [ ] Progress bar shows for running tasks
- [ ] Avatar placeholder shows for assigned tasks
- [ ] Clicking task card opens task detail (if implemented)

---

## Appendix: Creating Dependencies for Testing

### Option A: Creating Dependencies via API

**Step 1:** Get task IDs
```bash
curl http://localhost:3000/api/projects/1/tasks \
  -H "X-User-Id: 1" | jq '.data[] | {id, title}'
```

**Step 2:** Create dependency (Task B depends on Task A)
```bash
# Make Task B (id=2) depend on Task A (id=1)
curl -X POST http://localhost:3000/api/tasks/2/dependencies \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{"depends_on_task_id": 1}'
```

**Step 3:** Verify dependency
```bash
curl http://localhost:3000/api/tasks/2/dependencies \
  -H "X-User-Id: 1"
```

**Step 4:** Refresh board to see blocked indicator on Task B

---

### Option B: Creating Dependencies via Database

**Step 1:** Open SQLite database
```bash
cd orchestrator
sqlite3 data/specflux.db
```

**Step 2:** View existing tasks
```sql
SELECT id, title, status FROM tasks WHERE project_id = 1;
```

**Step 3:** Insert dependency
```sql
-- Make task 2 depend on task 1
INSERT INTO task_dependencies (task_id, depends_on_task_id)
VALUES (2, 1);
```

**Step 4:** Verify blocked count
```sql
SELECT
  t.id,
  t.title,
  t.status,
  (
    SELECT COUNT(*) FROM task_dependencies td
    INNER JOIN tasks blocker ON blocker.id = td.depends_on_task_id
    WHERE td.task_id = t.id AND blocker.status NOT IN ('approved', 'done')
  ) as blocked_by_count
FROM tasks t
WHERE t.id = 2;
```

**Step 5:** Exit SQLite and refresh board
```sql
.exit
```

---

### Example Test Scenario

**Create a blocked task chain:**
```bash
# Assume you have Task #1, #2, #3 all in "backlog" status

# Task 3 depends on Task 2
curl -X POST http://localhost:3000/api/tasks/3/dependencies \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{"depends_on_task_id": 2}'

# Task 3 also depends on Task 1
curl -X POST http://localhost:3000/api/tasks/3/dependencies \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{"depends_on_task_id": 1}'

# Result: Task #3 should show "🔒 2" blocked by 2 tasks
```

**Test unblocking:**
```bash
# Complete Task 1
curl -X PATCH http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{"status": "done"}'

# Refresh board - Task #3 should now show "🔒 1" (only blocked by Task 2)
```

---

## Sign-off

- [ ] All tests passed
- [ ] No visual glitches observed
- [ ] Dark mode works correctly
- [ ] Performance is acceptable
- [ ] Ready for merge

**Tested by:** _______________
**Date:** _______________
**Build/Commit:** _______________
