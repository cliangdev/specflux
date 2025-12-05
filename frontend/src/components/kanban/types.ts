import { TaskStatus } from "../../api";

/**
 * Workflow templates available in SpecFlux
 * Each template defines a set of phases and default kanban columns
 */
export type WorkflowTemplate =
  | "startup-fast"
  | "design-first"
  | "full-lifecycle";

/**
 * A single kanban column configuration
 */
export interface KanbanColumn {
  id: string;
  title: string;
  status: TaskStatus; // Maps to task status for filtering
  color: string; // TailwindCSS color class
}

/**
 * Default column configurations per workflow template
 * Users can customize these per project
 */
export const WORKFLOW_COLUMNS: Record<WorkflowTemplate, KanbanColumn[]> = {
  "startup-fast": [
    {
      id: "backlog",
      title: "Backlog",
      status: TaskStatus.Backlog,
      color: "slate",
    },
    {
      id: "ready",
      title: "Ready",
      status: TaskStatus.Ready,
      color: "blue",
    },
    {
      id: "in-progress",
      title: "In Progress",
      status: TaskStatus.InProgress,
      color: "yellow",
    },
    {
      id: "review",
      title: "In Review",
      status: TaskStatus.InReview,
      color: "purple",
    },
    {
      id: "done",
      title: "Done",
      status: TaskStatus.Completed,
      color: "emerald",
    },
  ],
  "design-first": [
    {
      id: "backlog",
      title: "Backlog",
      status: TaskStatus.Backlog,
      color: "slate",
    },
    {
      id: "ready",
      title: "Ready",
      status: TaskStatus.Ready,
      color: "blue",
    },
    {
      id: "in-progress",
      title: "In Progress",
      status: TaskStatus.InProgress,
      color: "yellow",
    },
    {
      id: "review",
      title: "In Review",
      status: TaskStatus.InReview,
      color: "purple",
    },
    {
      id: "blocked",
      title: "Blocked",
      status: TaskStatus.Blocked,
      color: "rose",
    },
    {
      id: "done",
      title: "Done",
      status: TaskStatus.Completed,
      color: "emerald",
    },
  ],
  "full-lifecycle": [
    {
      id: "backlog",
      title: "Backlog",
      status: TaskStatus.Backlog,
      color: "slate",
    },
    {
      id: "ready",
      title: "Ready",
      status: TaskStatus.Ready,
      color: "blue",
    },
    {
      id: "in-progress",
      title: "In Progress",
      status: TaskStatus.InProgress,
      color: "yellow",
    },
    {
      id: "review",
      title: "In Review",
      status: TaskStatus.InReview,
      color: "purple",
    },
    {
      id: "blocked",
      title: "Blocked",
      status: TaskStatus.Blocked,
      color: "rose",
    },
    {
      id: "done",
      title: "Done",
      status: TaskStatus.Completed,
      color: "emerald",
    },
  ],
};

/**
 * Get columns for a workflow template with optional custom overrides
 */
export function getColumnsForWorkflow(
  template: WorkflowTemplate,
  customColumns?: KanbanColumn[],
): KanbanColumn[] {
  return (
    customColumns ??
    WORKFLOW_COLUMNS[template] ??
    WORKFLOW_COLUMNS["startup-fast"]
  );
}

/**
 * Available colors for repository badges
 * Each color has distinct light/dark mode variants
 */
const REPO_COLORS = [
  "blue",
  "purple",
  "emerald",
  "amber",
  "rose",
  "cyan",
  "indigo",
  "teal",
] as const;

/**
 * Generate a deterministic color based on repository name
 * Same repo name will always get the same color
 */
export function getRepoColor(repoName: string | null | undefined): string {
  if (!repoName) return "slate";

  // Simple hash function for deterministic color selection
  let hash = 0;
  for (let i = 0; i < repoName.length; i++) {
    const char = repoName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const index = Math.abs(hash) % REPO_COLORS.length;
  return REPO_COLORS[index];
}

/**
 * Get TailwindCSS classes for a repo color badge
 */
export function getRepoColorClasses(repoName: string | null | undefined): {
  bg: string;
  text: string;
} {
  const color = getRepoColor(repoName);

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/40",
      text: "text-blue-700 dark:text-blue-300",
    },
    purple: {
      bg: "bg-purple-100 dark:bg-purple-900/40",
      text: "text-purple-700 dark:text-purple-300",
    },
    emerald: {
      bg: "bg-emerald-100 dark:bg-emerald-900/40",
      text: "text-emerald-700 dark:text-emerald-300",
    },
    amber: {
      bg: "bg-amber-100 dark:bg-amber-900/40",
      text: "text-amber-700 dark:text-amber-300",
    },
    rose: {
      bg: "bg-rose-100 dark:bg-rose-900/40",
      text: "text-rose-700 dark:text-rose-300",
    },
    cyan: {
      bg: "bg-cyan-100 dark:bg-cyan-900/40",
      text: "text-cyan-700 dark:text-cyan-300",
    },
    indigo: {
      bg: "bg-indigo-100 dark:bg-indigo-900/40",
      text: "text-indigo-700 dark:text-indigo-300",
    },
    teal: {
      bg: "bg-teal-100 dark:bg-teal-900/40",
      text: "text-teal-700 dark:text-teal-300",
    },
    slate: {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-600 dark:text-slate-400",
    },
  };

  return colorMap[color] ?? colorMap.slate;
}

export function getColumnColorClasses(color: string): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  const colors: Record<
    string,
    { bg: string; text: string; border: string; badge: string }
  > = {
    slate: {
      bg: "bg-slate-500/10 dark:bg-slate-500/20",
      text: "text-slate-700 dark:text-slate-300",
      border: "border-slate-500/30",
      badge:
        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
    },
    blue: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-500/30",
      badge: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    },
    yellow: {
      bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
      text: "text-yellow-700 dark:text-yellow-300",
      border: "border-yellow-500/30",
      badge:
        "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
    },
    purple: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      text: "text-purple-700 dark:text-purple-300",
      border: "border-purple-500/30",
      badge:
        "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
    },
    cyan: {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
      text: "text-cyan-700 dark:text-cyan-300",
      border: "border-cyan-500/30",
      badge: "bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400",
    },
    emerald: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-500/30",
      badge:
        "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400",
    },
    rose: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-500/30",
      badge: "bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400",
    },
  };
  return colors[color] ?? colors.slate;
}
