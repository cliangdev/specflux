# Week 4 Manual Test Cases

## File Change Tracking



## Terminal Output

### Basic Terminal Functionality
- [ ] Start an agent on a task
- [ ] Verify terminal shows Claude Code output in real-time
- [ ] Verify terminal scrolls automatically as new output arrives
- [ ] Verify terminal can be scrolled manually to view history

### Agent Status Detection
- [ ] Start an agent - status badge should show "running" with green pulse
- [ ] Let agent complete - status should change to "completed" or "idle"
- [ ] Start agent and stop it manually - status should show "stopped"

## Progress Tracking

### Task Progress
- [ ] Create a task and start the agent
- [ ] Verify progress bar updates as agent works
- [ ] Verify progress percentage is displayed correctly

## GitHub Integration

### PR Creation (requires GitHub repo with remote)
- [ ] Complete a task with file changes
- [ ] Task should move to "pending_review" status
- [ ] Click "Create PR" button
- [ ] Verify PR is created on GitHub
- [ ] Verify PR link appears in the UI
- [ ] Click PR link - should open GitHub PR page

### Task Approval
- [ ] With a task in "pending_review" status
- [ ] Click "Approve" button
- [ ] Verify task moves to "done" status

## Edge Cases

### No Worktree
- [ ] View a task that has never had an agent started
- [ ] File changes should show "No file changes tracked yet"
- [ ] No errors should appear in console

### Empty Worktree
- [ ] Start an agent that doesn't make any changes
- [ ] File changes should show "No file changes tracked yet"

### Multiple Tasks
- [ ] Create multiple tasks for the same project
- [ ] Start agents on different tasks
- [ ] Verify each task shows its own file changes (isolated worktrees)

## Performance

### Polling Behavior
- [ ] With agent running, verify polling is ~3 seconds (fast)
- [ ] With agent idle, verify polling is ~10 seconds (slower)
- [ ] Verify no excessive network requests in browser dev tools
