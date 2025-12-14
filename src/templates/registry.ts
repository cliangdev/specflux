/**
 * Template Registry
 *
 * Defines all available templates with their source files and destinations.
 * This registry makes it easy to add new templates and track what's available.
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
 */
export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  {
    id: "prd",
    sourceFile: "commands/prd.md",
    destPath: ".claude/commands/prd.md",
    description: "/prd - Create or refine product specification",
    category: "command",
  },
  {
    id: "epic",
    sourceFile: "commands/epic.md",
    destPath: ".claude/commands/epic.md",
    description: "/epic - Define or refine an epic",
    category: "command",
  },
  {
    id: "implement",
    sourceFile: "commands/implement.md",
    destPath: ".claude/commands/implement.md",
    description: "/implement - Implement an epic",
    category: "command",
  },
  {
    id: "task",
    sourceFile: "commands/task.md",
    destPath: ".claude/commands/task.md",
    description: "/task - Work on a specific task",
    category: "command",
  },
  {
    id: "claude-md",
    sourceFile: "CLAUDE.md",
    destPath: "CLAUDE.md",
    description: "Project CLAUDE.md with SpecFlux commands",
    category: "config",
  },
  // Skill templates
  {
    id: "skill-frontend-design",
    sourceFile: "skills/frontend-design/SKILL.md",
    destPath: ".claude/skills/frontend-design/SKILL.md",
    description: "Distinctive, production-grade frontend design patterns",
    category: "skill",
  },
  {
    id: "skill-frontend-design-license",
    sourceFile: "skills/frontend-design/LICENSE.txt",
    destPath: ".claude/skills/frontend-design/LICENSE.txt",
    description: "License for frontend-design skill",
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
  {
    id: "skill-specflux-api",
    sourceFile: "skills/specflux-api/SKILL.md",
    destPath: ".claude/skills/specflux-api/SKILL.md",
    description: "SpecFlux REST API for managing projects, epics, and tasks",
    category: "skill",
  },
  {
    id: "skill-specflux-api-reference",
    sourceFile: "skills/specflux-api/references/api.md",
    destPath: ".claude/skills/specflux-api/references/api.md",
    description: "Complete SpecFlux API endpoint documentation",
    category: "skill",
  },
  // MCP config template
  {
    id: "mcp-config",
    sourceFile: ".mcp.json",
    destPath: ".claude/.mcp.json",
    description: "MCP server configuration (GitHub, filesystem)",
    category: "mcp",
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
