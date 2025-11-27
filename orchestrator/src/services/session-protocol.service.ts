/**
 * Session Protocol Service
 *
 * Generates protocol instructions that are injected into Claude Code agents
 * to guide their behavior during task execution sessions.
 */

import { getTaskById } from './task.service';
import { getTaskStatePath, hasTaskState, createTaskState } from './task-state.service';
import { listCriteria } from './acceptance-criteria.service';

export interface TaskProtocol {
  initialPrompt: string;
  taskId: number;
  apiBaseUrl: string;
  stateFilePath: string;
}

/**
 * Generate the session protocol instructions for a task
 */
export function generateTaskProtocol(
  taskId: number,
  projectPath: string,
  apiBaseUrl: string = 'http://localhost:3000/api'
): TaskProtocol {
  const task = getTaskById(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  // Ensure state file exists
  if (!hasTaskState(projectPath, taskId)) {
    createTaskState(projectPath, taskId, task.title, task.epic_id ?? null);
  }

  const stateFilePath = getTaskStatePath(projectPath, taskId);

  // Get acceptance criteria
  const criteria = listCriteria('task', taskId);
  const uncheckedCriteria = criteria.filter((c) => !c.checked);
  const checkedCriteria = criteria.filter((c) => c.checked);

  // Build progress summary from criteria
  const progressSummary =
    criteria.length > 0
      ? `${checkedCriteria.length}/${criteria.length} criteria completed`
      : 'No acceptance criteria defined';

  // Build criteria list for prompt
  const criteriaList =
    criteria.length > 0
      ? criteria.map((c, i) => `${c.checked ? '[x]' : '[ ]'} ${i + 1}. ${c.text}`).join('\n')
      : '(No acceptance criteria defined - implement based on description)';

  // Build the comprehensive initial prompt
  const initialPrompt = `# Task Assignment

## Task #${task.id}: ${task.title}

**Status:** ${task.status}
**Progress:** ${progressSummary}

### Description
${task.description ?? 'No description provided.'}

### Acceptance Criteria
${criteriaList}

${task.scope_in ? `### In Scope\n${task.scope_in}\n` : ''}
${task.scope_out ? `### Out of Scope\n${task.scope_out}\n` : ''}

---

## Session Protocol

Follow these steps for this session:

### Phase 1: Orientation (5 min)
1. Read the state file for context: \`${stateFilePath}\`
2. Run \`git status\` to check repo state
3. Review acceptance criteria above - identify unchecked items

### Phase 2: Implementation
${
  uncheckedCriteria.length > 0 && uncheckedCriteria[0]
    ? `4. Focus on this criterion: **"${uncheckedCriteria[0].text}"**`
    : '4. All criteria completed - verify and write chain output'
}
5. Read relevant source files FIRST before making changes
6. Implement changes directly (don't just suggest)
7. Write tests to verify the implementation

### Phase 3: Handoff
8. After verifying the implementation works:
   - Check off completed criterion via API:
     \`\`\`bash
     curl -X PUT ${apiBaseUrl}/tasks/${taskId}/criteria/${uncheckedCriteria[0]?.id ?? '{criterionId}'} \\
       -H "Content-Type: application/json" \\
       -H "X-User-Id: 1" \\
       -d '{"checked": true}'
     \`\`\`
9. Update the Progress Log section in \`${stateFilePath}\`:
   \`\`\`markdown
   ### Session N - YYYY-MM-DD HH:MM
   **Did:**
   - [What you accomplished]

   **Issues:** [Any blockers or None]

   **Next:** [Clear next steps]
   \`\`\`
10. If ALL criteria are checked → Write the Chain Output section

---

## Rules

DO NOT suggest changes - IMPLEMENT them directly.
DO NOT add features beyond the acceptance criteria.
DO NOT assume file contents - read them first.
DO NOT skip testing - verify your implementation.

DO check off criteria via API after testing.
DO update the progress log before ending.
DO keep solutions simple and direct.

---

Begin by reading the state file and checking git status.`;

  return {
    initialPrompt,
    taskId,
    apiBaseUrl,
    stateFilePath,
  };
}

/**
 * Generate a brief status prompt for continuing work
 */
export function generateContinuationPrompt(taskId: number, _projectPath: string): string {
  const task = getTaskById(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const criteria = listCriteria('task', taskId);
  const uncheckedCriteria = criteria.filter((c) => !c.checked);

  if (uncheckedCriteria.length === 0) {
    return `Continue working on Task #${taskId}: ${task.title}

All acceptance criteria are completed. Please:
1. Verify the implementation is complete
2. Write the Chain Output section in the state file
3. End the session`;
  }

  const nextCriterion = uncheckedCriteria[0];
  return `Continue working on Task #${taskId}: ${task.title}

Next criterion to implement: "${nextCriterion?.text ?? 'No criteria remaining'}"

Read the state file for context and continue from where you left off.`;
}

/**
 * Generate epic review protocol
 */
export function generateEpicProtocol(epicId: number, epicTitle: string): string {
  return `# Epic Review

## Epic: ${epicTitle}

Please review this epic for planning quality.

Read the CLAUDE.md file in this directory - it contains the epic details, PRD, and all tasks.

### Review Checklist
1. **PRD Completeness** - Does the PRD clearly define the problem and solution?
2. **Task Sizing** - Are tasks appropriately sized (1-3 sessions each)?
3. **Task Descriptions** - Does each task have clear description and acceptance criteria?
4. **Dependencies** - Are task dependencies correctly defined?
5. **Coverage** - Are there any missing tasks to complete the epic?

### Output Format
Provide your feedback as:
- [ ] Issues found (if any)
- [ ] Suggestions for improvement
- [ ] Missing tasks (if any)`;
}

/**
 * Generate project review protocol
 */
export function generateProjectProtocol(_projectId: number): string {
  return `# Project Overview

Please review this project and help with coordination, planning, or cross-epic analysis.

Read the CLAUDE.md file in this directory - it contains:
- Project statistics
- Repository information
- Epics overview with status
- Recent tasks and their status

### What You Can Help With
1. **Cross-epic coordination** - Identify dependencies between epics
2. **Planning** - Suggest epic priorities or identify gaps
3. **Analysis** - Review overall project progress
4. **Questions** - Answer questions about the project structure`;
}
