/**
 * Template Content
 *
 * Imports all template files as raw strings using Vite's ?raw suffix.
 * This bundles the markdown content directly into the application.
 *
 * NOTE: Commands and specflux-api skill are provided by the SpecFlux plugin
 * installed at ~/.claude/plugins/specflux/. Only project-specific tech skills
 * are bundled here.
 */

// Config templates
import claudeMdTemplate from "./files/CLAUDE.md?raw";
import mcpConfig from "./files/.mcp.json?raw";

// Project-specific skill templates (tech patterns)
import frontendDesignSkill from "./files/skills/frontend-design/SKILL.md?raw";
import springbootPatternsSkill from "./files/skills/springboot-patterns/SKILL.md?raw";
import typescriptPatternsSkill from "./files/skills/typescript-patterns/SKILL.md?raw";
import uiPatternsSkill from "./files/skills/ui-patterns/SKILL.md?raw";

/**
 * Map of source file paths to their content.
 * Keys match the sourceFile property in TEMPLATE_REGISTRY.
 */
export const TEMPLATE_CONTENT: Record<string, string> = {
  // Config
  "CLAUDE.md": claudeMdTemplate,
  ".mcp.json": mcpConfig,
  // Project-specific skills (tech patterns)
  "skills/frontend-design/SKILL.md": frontendDesignSkill,
  "skills/springboot-patterns/SKILL.md": springbootPatternsSkill,
  "skills/typescript-patterns/SKILL.md": typescriptPatternsSkill,
  "skills/ui-patterns/SKILL.md": uiPatternsSkill,
};

/**
 * Get the content of a template by its source file path.
 */
export function getTemplateContent(sourceFile: string): string | undefined {
  return TEMPLATE_CONTENT[sourceFile];
}
