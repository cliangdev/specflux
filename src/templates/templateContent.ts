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

// Agent templates
import frontendDevAgent from "./files/agents/frontend-dev.md?raw";
import backendDevAgent from "./files/agents/backend-dev.md?raw";
import fullstackDevAgent from "./files/agents/fullstack-dev.md?raw";

// Skill templates
import uiPatternsSkill from "./files/skills/ui-patterns/SKILL.md?raw";
import apiDesignSkill from "./files/skills/api-design/SKILL.md?raw";
import typescriptPatternsSkill from "./files/skills/typescript-patterns/SKILL.md?raw";

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
  // Agents
  "agents/frontend-dev.md": frontendDevAgent,
  "agents/backend-dev.md": backendDevAgent,
  "agents/fullstack-dev.md": fullstackDevAgent,
  // Skills
  "skills/ui-patterns/SKILL.md": uiPatternsSkill,
  "skills/api-design/SKILL.md": apiDesignSkill,
  "skills/typescript-patterns/SKILL.md": typescriptPatternsSkill,
  // MCP config
  ".mcp.json": mcpConfig,
};

/**
 * Get the content of a template by its source file path.
 */
export function getTemplateContent(sourceFile: string): string | undefined {
  return TEMPLATE_CONTENT[sourceFile];
}
