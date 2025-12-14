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

// Skill templates
import frontendDesignSkill from "./files/skills/frontend-design/SKILL.md?raw";
import springbootPatternsSkill from "./files/skills/springboot-patterns/SKILL.md?raw";
import typescriptPatternsSkill from "./files/skills/typescript-patterns/SKILL.md?raw";
import uiPatternsSkill from "./files/skills/ui-patterns/SKILL.md?raw";
import specfluxApiSkill from "./files/skills/specflux-api/SKILL.md?raw";
import specfluxApiReference from "./files/skills/specflux-api/references/api.md?raw";

// MCP config template
import mcpConfig from "./files/.mcp.json?raw";

// Claude Code settings template
import claudeSettings from "./files/.claude/settings.json?raw";

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
  // Skills
  "skills/frontend-design/SKILL.md": frontendDesignSkill,
  "skills/springboot-patterns/SKILL.md": springbootPatternsSkill,
  "skills/typescript-patterns/SKILL.md": typescriptPatternsSkill,
  "skills/ui-patterns/SKILL.md": uiPatternsSkill,
  "skills/specflux-api/SKILL.md": specfluxApiSkill,
  "skills/specflux-api/references/api.md": specfluxApiReference,
  // MCP config
  ".mcp.json": mcpConfig,
  // Claude Code settings
  ".claude/settings.json": claudeSettings,
};

/**
 * Get the content of a template by its source file path.
 */
export function getTemplateContent(sourceFile: string): string | undefined {
  return TEMPLATE_CONTENT[sourceFile];
}
