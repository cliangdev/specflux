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
  category: "command" | "config";
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
