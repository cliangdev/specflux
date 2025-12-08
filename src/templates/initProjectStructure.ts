/**
 * Initialize and Sync Project Structure
 *
 * Creates the .specflux/ and .claude/ directories with all required
 * subdirectories and template files for a SpecFlux-managed project.
 */

import { mkdir, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { TEMPLATE_REGISTRY, type TemplateDefinition } from "./registry";
import { getTemplateContent } from "./templateContent";

/**
 * Result of a template sync operation.
 */
export interface SyncResult {
  /** Templates that were created (didn't exist before) */
  created: string[];
  /** Templates that were skipped (already exist, not forced) */
  skipped: string[];
  /** Templates that were updated (force mode) */
  updated: string[];
  /** Templates that failed to sync */
  errors: Array<{ id: string; error: string }>;
}

/**
 * Status of a single template in a project.
 */
export interface TemplateStatus {
  /** Template ID from registry */
  id: string;
  /** Whether the template file exists in the project */
  exists: boolean;
  /** Full path to the template in the project */
  path: string;
  /** Template description */
  description: string;
  /** Template category */
  category: TemplateDefinition["category"];
}

/**
 * Options for syncing templates.
 */
export interface SyncOptions {
  /** If true, overwrite existing templates */
  force?: boolean;
  /** Specific template IDs to sync (default: all) */
  templateIds?: string[];
}

/**
 * Initialize the project directory structure.
 *
 * Creates:
 * - .specflux/prds/
 * - .specflux/epics/
 * - .specflux/task-states/
 * - .claude/commands/ (with all command templates)
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

  // Sync all templates (without forcing overwrites)
  await syncTemplates(projectPath);
}

/**
 * Sync templates to a project directory.
 *
 * @param projectPath - The root path of the project
 * @param options - Sync options (force, templateIds)
 * @returns Promise with sync results
 */
export async function syncTemplates(
  projectPath: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const { force = false, templateIds } = options;

  const result: SyncResult = {
    created: [],
    skipped: [],
    updated: [],
    errors: [],
  };

  // Filter templates if specific IDs requested
  const templates = templateIds
    ? TEMPLATE_REGISTRY.filter((t) => templateIds.includes(t.id))
    : TEMPLATE_REGISTRY;

  // Ensure parent directories exist for command templates
  const commandsDir = await join(projectPath, ".claude/commands");
  const commandsDirExists = await exists(commandsDir);
  if (!commandsDirExists) {
    await mkdir(commandsDir, { recursive: true });
  }

  for (const template of templates) {
    try {
      const destPath = await join(projectPath, template.destPath);
      const content = getTemplateContent(template.sourceFile);

      if (!content) {
        result.errors.push({
          id: template.id,
          error: `Template content not found for ${template.sourceFile}`,
        });
        continue;
      }

      const fileExists = await exists(destPath);

      if (fileExists && !force) {
        result.skipped.push(template.id);
      } else if (fileExists && force) {
        await writeTextFile(destPath, content);
        result.updated.push(template.id);
      } else {
        await writeTextFile(destPath, content);
        result.created.push(template.id);
      }
    } catch (error) {
      result.errors.push({
        id: template.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

/**
 * Get the status of all templates in a project.
 *
 * @param projectPath - The root path of the project
 * @returns Promise with status of each template
 */
export async function getTemplateStatus(
  projectPath: string,
): Promise<TemplateStatus[]> {
  const statuses: TemplateStatus[] = [];

  for (const template of TEMPLATE_REGISTRY) {
    try {
      const fullPath = await join(projectPath, template.destPath);
      const fileExists = await exists(fullPath);

      statuses.push({
        id: template.id,
        exists: fileExists,
        path: fullPath,
        description: template.description,
        category: template.category,
      });
    } catch {
      statuses.push({
        id: template.id,
        exists: false,
        path: template.destPath,
        description: template.description,
        category: template.category,
      });
    }
  }

  return statuses;
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
