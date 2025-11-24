# Manual Testing Checklist - Kanban Board (PR #38)

## Prerequisites
- [ ] Backend running (`cd orchestrator && npm run dev`)
- [ ] Frontend running (`cd frontend && npm run tauri dev` or `npm run dev`)
- [ ] At least one project exists with tasks in various statuses

## Basic Rendering
- [ ] Board page loads without errors
- [ ] "Sprint Board" header displays
- [ ] All workflow columns render (Backlog, Ready, In Progress, Review, Done)
- [ ] Column headers show task count badges
- [ ] "New Task" button appears in header

## Task Cards
- [ ] Tasks appear in correct columns based on their status
- [ ] Task cards show:
  - [ ] Task ID (e.g., #123)
  - [ ] Task title
  - [ ] Task description (truncated if long)
  - [ ] Repository tag (if assigned)
- [ ] Running tasks show animated "Running" indicator
- [ ] Tasks with progress show progress bar at bottom

## Drag and Drop
- [ ] Can pick up a task card (card becomes semi-transparent)
- [ ] Drag overlay shows card preview while dragging
- [ ] Target column highlights when dragging over it
- [ ] Dropping task in new column updates its status
- [ ] Task appears in new column immediately (optimistic update)
- [ ] Refreshing page shows task in new column (server persisted)
- [ ] Dropping task in same column does nothing (no unnecessary API call)

## Task Interactions
- [ ] Clicking task card navigates to task detail page (`/tasks/:id`)
- [ ] "New Task" button opens task creation modal
- [ ] Creating task refreshes board with new task

## Empty States
- [ ] Columns with no tasks show "No tasks" message
- [ ] Board shows loading spinner while fetching tasks
- [ ] Board shows error message with retry button if fetch fails

## No Project Selected
- [ ] Shows "No Project Selected" message when no project is active

## Dark Mode
- [ ] All components render correctly in dark mode
- [ ] Toggle theme and verify colors update properly

## Responsive/Scroll
- [ ] Board scrolls horizontally when columns overflow
- [ ] Individual columns scroll vertically when tasks overflow

---

## Test Results

| Tester | Date | Result | Notes |
|--------|------|--------|-------|
|        |      |        |       |
