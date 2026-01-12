/**
 * Template Registry
 *
 * Defines all available templates with their source files and destinations.
 * This registry makes it easy to add new templates and track what's available.
 *
 * NOTE: Commands and specflux-api skill are provided by the SpecFlux plugin
 * installed at ~/.claude/plugins/specflux/. Only project-specific tech skills
 * are synced here.
 */

export interface TemplateDefinition {
  /** Unique identifier for the template */
  id: string;
  /** Source file path relative to src/templates/files/ */
  sourceFile: string;
  /** Destination path relative to project root */
  destPath: string;
  /** Human-readable description */
  description: string;
  /** Category for grouping in UI */
  category: "command" | "config" | "skill" | "mcp";
}

/**
 * All available templates that can be synced to projects.
 *
 * Commands (/specflux:planning, /specflux:implement) are provided by the
 * SpecFlux plugin and NOT included here.
 */
export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  // Config templates
  {
    id: "claude-md",
    sourceFile: "CLAUDE.md",
    destPath: "CLAUDE.md",
    description: "Project CLAUDE.md with SpecFlux plugin reference",
    category: "config",
  },
  {
    id: "claude-settings",
    sourceFile: ".claude/settings.json",
    destPath: ".claude/settings.json",
    description: "Claude Code permissions and security settings",
    category: "config",
  },
  // MCP config template
  {
    id: "mcp-config",
    sourceFile: ".mcp.json",
    destPath: ".claude/.mcp.json",
    description: "MCP server configuration (GitHub, filesystem)",
    category: "mcp",
  },
  // Project-specific skill templates (tech patterns)
  {
    id: "skill-frontend-design",
    sourceFile: "skills/frontend-design/SKILL.md",
    destPath: ".claude/skills/frontend-design/SKILL.md",
    description: "Distinctive, production-grade frontend design patterns",
    category: "skill",
  },
  {
    id: "skill-springboot-patterns",
    sourceFile: "skills/springboot-patterns/SKILL.md",
    destPath: ".claude/skills/springboot-patterns/SKILL.md",
    description: "Spring Boot and Java best practices with DDD architecture",
    category: "skill",
  },
  {
    id: "skill-typescript-patterns",
    sourceFile: "skills/typescript-patterns/SKILL.md",
    destPath: ".claude/skills/typescript-patterns/SKILL.md",
    description: "TypeScript best practices and type safety",
    category: "skill",
  },
  {
    id: "skill-ui-patterns",
    sourceFile: "skills/ui-patterns/SKILL.md",
    destPath: ".claude/skills/ui-patterns/SKILL.md",
    description: "UI design patterns with React and TailwindCSS",
    category: "skill",
  },
];

/**
 * Get a template definition by ID.
 */
export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY.find((t) => t.id === id);
}

/**
 * Get all templates in a specific category.
 */
export function getTemplatesByCategory(
  category: TemplateDefinition["category"],
): TemplateDefinition[] {
  return TEMPLATE_REGISTRY.filter((t) => t.category === category);
}
