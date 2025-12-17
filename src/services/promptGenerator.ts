/**
 * Prompt Generator Service
 *
 * Generates CLAUDE.md content and session prompts for SpecFlux projects.
 * Used to provide context to Claude Code when working on tasks, epics, or releases.
 */

import type { Project } from "../api/generated/models";

// Import prompt templates
import prdPromptTemplate from "../templates/prompts/prd-context.md?raw";
import epicPromptTemplate from "../templates/prompts/epic-context.md?raw";
import taskPromptTemplate from "../templates/prompts/task-context.md?raw";
import projectPromptTemplate from "../templates/prompts/project-context.md?raw";

export interface ProjectConfig {
  name: string;
  key?: string;
  localPath?: string;
  techStack?: {
    frontend?: string;
    backend?: string;
    database?: string;
  };
  projectStructure?: string[];
}

export type SessionScope = "task" | "epic" | "release";

export interface SessionContext {
  scope: SessionScope;
  ref: string;
  displayKey?: string;
  title?: string;
  projectRef: string;
  apiBaseUrl?: string;
}

/**
 * Generate CLAUDE.md content for a project
 *
 * This creates the static project context that lives in the repo.
 * It should be rarely updated - only when project fundamentals change.
 */
export function generateClaudeMd(config: ProjectConfig): string {
  const techStack = config.techStack || {
    frontend: "React, TypeScript, TailwindCSS",
    backend: "Node.js, Express",
    database: "PostgreSQL",
  };

  const structure = config.projectStructure || [
    "`src/components/` - React components",
    "`src/api/` - Generated API client",
    "`openapi/api.yaml` - API spec",
  ];

  return `# CLAUDE.md

## Project

${config.name}${config.key ? ` (${config.key})` : ""}

This project is managed by SpecFlux.

## SpecFlux API

Base URL: http://localhost:8090/api
Auth: Bearer token (in environment)

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /projects/{projectRef}/tasks/{ref} | Single task with acceptance criteria |
| GET | /projects/{projectRef}/epics/{ref}?include=tasks | Epic with all tasks |
| GET | /projects/{projectRef}/releases/{ref}?include=epics,tasks | Full release context |
| PATCH | /projects/{projectRef}/tasks/{ref} | Update task status |
| PUT | /projects/{projectRef}/epics/{ref} | Update epic notes (session handoff) |

## Tech Stack

- Frontend: ${techStack.frontend}
- Backend: ${techStack.backend}
- Database: ${techStack.database}

## Project Structure

${structure.map((s) => `- ${s}`).join("\n")}

## Rules

- ONE task at a time
- Test before marking done
- Commit after each task
- Update notes before ending session
`;
}

/**
 * Generate session prompt based on scope (task, epic, or release)
 *
 * This is generated fresh each time a user starts a session.
 * The prompt guides Claude through the standard workflow.
 */
export function generateSessionPrompt(context: SessionContext): string {
  const apiBaseUrl = context.apiBaseUrl || "http://localhost:8090/api";
  const projectPath = `/projects/${context.projectRef}`;

  let apiCall: string;
  let scopeDescription: string;

  switch (context.scope) {
    case "task":
      apiCall = `GET ${apiBaseUrl}${projectPath}/tasks/${context.ref}`;
      scopeDescription = `Task: ${context.displayKey || context.ref}${context.title ? ` - ${context.title}` : ""}`;
      break;
    case "epic":
      apiCall = `GET ${apiBaseUrl}${projectPath}/epics/${context.ref}?include=tasks`;
      scopeDescription = `Epic: ${context.displayKey || context.ref}${context.title ? ` - ${context.title}` : ""}`;
      break;
    case "release":
      apiCall = `GET ${apiBaseUrl}${projectPath}/releases/${context.ref}?include=epics,tasks`;
      scopeDescription = `Release: ${context.displayKey || context.ref}${context.title ? ` - ${context.title}` : ""}`;
      break;
  }

  return `You are working on a SpecFlux ${context.scope}.
This is a FRESH context window - no memory of previous sessions.

${scopeDescription}

## STEP 1: GET CONTEXT

First, fetch your work context:
\`\`\`
${apiCall}
\`\`\`

This will give you:
${context.scope === "task" ? "- Task details and acceptance criteria" : ""}
${context.scope === "epic" ? "- Epic details, session notes, and all tasks" : ""}
${context.scope === "release" ? "- Release with all epics and their tasks" : ""}

## STEP 2: SET UP ENVIRONMENT

- If \`init.sh\` exists in project root: run \`./init.sh\`
- If first session: install dependencies, verify build works

## STEP 3: VERIFY (if prior work exists)

Check that 1-2 previously completed tasks still work.
Fix any regressions FIRST before new work.

## STEP 4: IMPLEMENT

${context.scope === "task" ? "Implement this specific task. Focus on the acceptance criteria." : ""}
${context.scope === "epic" ? "Pick the next pending task from the epic and implement it." : ""}
${context.scope === "release" ? "Pick the next pending task (respecting epic dependencies) and implement it." : ""}

## STEP 5: UPDATE STATUS

When task is complete:
\`\`\`
PATCH ${apiBaseUrl}${projectPath}/tasks/{taskRef}
{ "status": "COMPLETED" }
\`\`\`

## STEP 6: COMMIT

\`\`\`
git commit -m "feat: {brief description of change}"
\`\`\`

## STEP 7: SESSION NOTES

Before ending, update session handoff notes:
${context.scope === "task" ? "Update task notes if needed for context." : ""}
${context.scope === "epic" || context.scope === "release" ? `\`\`\`
PUT ${apiBaseUrl}${projectPath}/epics/{epicRef}
{ "notes": "Session summary: what was done, what's next, any blockers" }
\`\`\`` : ""}

## STEP 8: CONTINUE OR END

If time remains and more tasks pending: go back to STEP 4.
Otherwise: ensure notes are updated and end the session cleanly.
`;
}

/**
 * Generate a short context header for terminal display
 */
export function generateContextHeader(context: SessionContext): string {
  const scopeEmoji =
    context.scope === "task" ? "📋" : context.scope === "epic" ? "🎯" : "🚀";
  return `${scopeEmoji} ${context.scope.toUpperCase()}: ${context.displayKey || context.ref}${context.title ? ` - ${context.title}` : ""}`;
}

/**
 * Convert a Project object to ProjectConfig for CLAUDE.md generation
 */
export function projectToConfig(project: Project): ProjectConfig {
  return {
    name: project.name,
    key: project.projectKey ?? undefined,
    localPath: project.localPath ?? undefined,
    // Default tech stack - could be extended to read from project settings
    techStack: {
      frontend: "React, TypeScript, TailwindCSS",
      backend: "Node.js, Express",
      database: "PostgreSQL",
    },
  };
}

// ============================================================================
// Launch Agent Context Prompts
// ============================================================================

/**
 * Context data for PRD prompt generation
 */
export interface PrdPromptContext {
  title: string;
  displayKey: string;
  status: string;
  documentCount: number;
}

/**
 * Context data for Epic prompt generation
 */
export interface EpicPromptContext {
  title: string;
  displayKey: string;
  status: string;
  taskCount: number;
}

/**
 * Context data for Task prompt generation
 */
export interface TaskPromptContext {
  title: string;
  displayKey: string;
  status: string;
  priority: string;
}

/**
 * Context data for Project prompt generation
 */
export interface ProjectPromptContext {
  name: string;
  projectKey: string;
}

/**
 * Fill template variables with actual values
 */
function fillTemplate(template: string, variables: Record<string, string | number | undefined>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, "g"), value?.toString() ?? "N/A");
  }
  return result;
}

/**
 * Generate PRD context prompt for Launch Agent button
 */
export function generatePrdPrompt(context: PrdPromptContext): string {
  return fillTemplate(prdPromptTemplate, {
    title: context.title,
    displayKey: context.displayKey,
    status: context.status,
    documentCount: context.documentCount,
  });
}

/**
 * Generate Epic context prompt for Launch Agent button
 */
export function generateEpicPrompt(context: EpicPromptContext): string {
  return fillTemplate(epicPromptTemplate, {
    title: context.title,
    displayKey: context.displayKey,
    status: context.status,
    taskCount: context.taskCount,
  });
}

/**
 * Generate Task context prompt for Launch Agent button
 */
export function generateTaskPrompt(context: TaskPromptContext): string {
  return fillTemplate(taskPromptTemplate, {
    title: context.title,
    displayKey: context.displayKey,
    status: context.status,
    priority: context.priority,
  });
}

/**
 * Generate Project context prompt for Launch Agent button
 */
export function generateProjectPrompt(context: ProjectPromptContext): string {
  return fillTemplate(projectPromptTemplate, {
    name: context.name,
    projectKey: context.projectKey,
  });
}
