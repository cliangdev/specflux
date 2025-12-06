/**
 * Initialize Project Structure
 *
 * Creates the .specflux/ and .claude/ directories with all required
 * subdirectories and template files for a SpecFlux-managed project.
 */

import { mkdir, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import {
  PRD_COMMAND_TEMPLATE,
  EPIC_COMMAND_TEMPLATE,
  IMPLEMENT_COMMAND_TEMPLATE,
  TASK_COMMAND_TEMPLATE,
  CLAUDE_MD_TEMPLATE,
} from "./projectTemplates";

/**
 * Initialize the project directory structure.
 *
 * Creates:
 * - .specflux/prds/
 * - .specflux/epics/
 * - .specflux/task-states/
 * - .claude/commands/ (with prd.md, epic.md, implement.md, task.md)
 * - .claude/agents/
 * - .claude/skills/
 * - CLAUDE.md
 *
 * @param projectPath - The root path of the project
 * @returns Promise that resolves when initialization is complete
 */
export async function initProjectStructure(projectPath: string): Promise<void> {
  // Create .specflux directories
  const specfluxDirs = [
    ".specflux/prds",
    ".specflux/epics",
    ".specflux/task-states",
  ];

  for (const dir of specfluxDirs) {
    const fullPath = await join(projectPath, dir);
    const dirExists = await exists(fullPath);
    if (!dirExists) {
      await mkdir(fullPath, { recursive: true });
    }
  }

  // Create .claude directories
  const claudeDirs = [".claude/commands", ".claude/agents", ".claude/skills"];

  for (const dir of claudeDirs) {
    const fullPath = await join(projectPath, dir);
    const dirExists = await exists(fullPath);
    if (!dirExists) {
      await mkdir(fullPath, { recursive: true });
    }
  }

  // Write slash command templates
  const commandTemplates = [
    { filename: "prd.md", content: PRD_COMMAND_TEMPLATE },
    { filename: "epic.md", content: EPIC_COMMAND_TEMPLATE },
    { filename: "implement.md", content: IMPLEMENT_COMMAND_TEMPLATE },
    { filename: "task.md", content: TASK_COMMAND_TEMPLATE },
  ];

  for (const template of commandTemplates) {
    const templatePath = await join(
      projectPath,
      ".claude/commands",
      template.filename,
    );
    const templateExists = await exists(templatePath);
    if (!templateExists) {
      await writeTextFile(templatePath, template.content);
    }
  }

  // Write CLAUDE.md at project root (only if it doesn't exist)
  const claudeMdPath = await join(projectPath, "CLAUDE.md");
  const claudeMdExists = await exists(claudeMdPath);
  if (!claudeMdExists) {
    await writeTextFile(claudeMdPath, CLAUDE_MD_TEMPLATE);
  }
}

/**
 * Check if a project has been initialized with SpecFlux structure.
 *
 * @param projectPath - The root path of the project
 * @returns Promise<boolean> - true if .specflux directory exists
 */
export async function isProjectInitialized(
  projectPath: string,
): Promise<boolean> {
  try {
    const specfluxPath = await join(projectPath, ".specflux");
    return await exists(specfluxPath);
  } catch {
    return false;
  }
}
