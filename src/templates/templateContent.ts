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

// Skill templates (generic skills only - project-specific skills stay in .claude/skills/)
import frontendDesignSkill from "./files/skills/frontend-design/SKILL.md?raw";
import frontendDesignLicense from "./files/skills/frontend-design/LICENSE.txt?raw";

// MCP config template
import mcpConfig from "./files/.mcp.json?raw";

/**
 * Map of source file paths to their content.
 * Keys match the sourceFile property in TEMPLATE_REGISTRY.
 */
export const TEMPLATE_CONTENT: Record<string, string> = {
  // Commands
  "commands/prd.md": prdTemplate,
  "commands/epic.md": epicTemplate,
  "commands/implement.md": implementTemplate,
  "commands/task.md": taskTemplate,
  "CLAUDE.md": claudeMdTemplate,
  // Skills (generic only)
  "skills/frontend-design/SKILL.md": frontendDesignSkill,
  "skills/frontend-design/LICENSE.txt": frontendDesignLicense,
  // MCP config
  ".mcp.json": mcpConfig,
};

/**
 * Get the content of a template by its source file path.
 */
export function getTemplateContent(sourceFile: string): string | undefined {
  return TEMPLATE_CONTENT[sourceFile];
}
