/**
 * Template Content
 *
 * Imports all template files as raw strings using Vite's ?raw suffix.
 * This bundles the markdown content directly into the application.
 */

// Import template files as raw strings
import prdTemplate from "./files/commands/prd.md?raw";
import epicTemplate from "./files/commands/epic.md?raw";
import implementTemplate from "./files/commands/implement.md?raw";
import taskTemplate from "./files/commands/task.md?raw";
import claudeMdTemplate from "./files/CLAUDE.md?raw";

/**
 * Map of source file paths to their content.
 * Keys match the sourceFile property in TEMPLATE_REGISTRY.
 */
export const TEMPLATE_CONTENT: Record<string, string> = {
  "commands/prd.md": prdTemplate,
  "commands/epic.md": epicTemplate,
  "commands/implement.md": implementTemplate,
  "commands/task.md": taskTemplate,
  "CLAUDE.md": claudeMdTemplate,
};

/**
 * Get the content of a template by its source file path.
 */
export function getTemplateContent(sourceFile: string): string | undefined {
  return TEMPLATE_CONTENT[sourceFile];
}
