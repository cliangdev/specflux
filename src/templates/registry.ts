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
  category: "command" | "config" | "agent" | "skill" | "mcp";
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
  // Agent templates
  {
    id: "agent-frontend-dev",
    sourceFile: "agents/frontend-dev.md",
    destPath: ".claude/agents/frontend-dev.md",
    description: "Frontend developer agent for React/TypeScript/Tauri",
    category: "agent",
  },
  {
    id: "agent-backend-dev",
    sourceFile: "agents/backend-dev.md",
    destPath: ".claude/agents/backend-dev.md",
    description: "Backend developer agent for Node.js/TypeScript/Express",
    category: "agent",
  },
  {
    id: "agent-fullstack-dev",
    sourceFile: "agents/fullstack-dev.md",
    destPath: ".claude/agents/fullstack-dev.md",
    description: "Fullstack developer agent for end-to-end features",
    category: "agent",
  },
  // Skill templates
  {
    id: "skill-ui-patterns",
    sourceFile: "skills/ui-patterns/SKILL.md",
    destPath: ".claude/skills/ui-patterns/SKILL.md",
    description: "UI design patterns and dark mode support",
    category: "skill",
  },
  {
    id: "skill-api-design",
    sourceFile: "skills/api-design/SKILL.md",
    destPath: ".claude/skills/api-design/SKILL.md",
    description: "REST API design patterns and OpenAPI workflow",
    category: "skill",
  },
  {
    id: "skill-typescript-patterns",
    sourceFile: "skills/typescript-patterns/SKILL.md",
    destPath: ".claude/skills/typescript-patterns/SKILL.md",
    description: "TypeScript best practices and type safety",
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
