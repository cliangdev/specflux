import { TaskStatusEnum } from "../../api/generated/models/Task";

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
  status: TaskStatusEnum; // Maps to task status for filtering
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
      status: TaskStatusEnum.Backlog,
      color: "slate",
    },
    {
      id: "ready",
      title: "Ready",
      status: TaskStatusEnum.Ready,
      color: "blue",
    },
    {
      id: "in-progress",
      title: "In Progress",
      status: TaskStatusEnum.InProgress,
      color: "yellow",
    },
    {
      id: "review",
      title: "Review",
      status: TaskStatusEnum.PendingReview,
      color: "purple",
    },
    {
      id: "done",
      title: "Done",
      status: TaskStatusEnum.Done,
      color: "emerald",
    },
  ],
  "design-first": [
    {
      id: "backlog",
      title: "Backlog",
      status: TaskStatusEnum.Backlog,
      color: "slate",
    },
    {
      id: "ready",
      title: "Ready",
      status: TaskStatusEnum.Ready,
      color: "blue",
    },
    {
      id: "in-progress",
      title: "In Progress",
      status: TaskStatusEnum.InProgress,
      color: "yellow",
    },
    {
      id: "review",
      title: "Review",
      status: TaskStatusEnum.PendingReview,
      color: "purple",
    },
    {
      id: "approved",
      title: "Approved",
      status: TaskStatusEnum.Approved,
      color: "cyan",
    },
    {
      id: "done",
      title: "Done",
      status: TaskStatusEnum.Done,
      color: "emerald",
    },
  ],
  "full-lifecycle": [
    {
      id: "backlog",
      title: "Backlog",
      status: TaskStatusEnum.Backlog,
      color: "slate",
    },
    {
      id: "ready",
      title: "Ready",
      status: TaskStatusEnum.Ready,
      color: "blue",
    },
    {
      id: "in-progress",
      title: "In Progress",
      status: TaskStatusEnum.InProgress,
      color: "yellow",
    },
    {
      id: "review",
      title: "Pending Review",
      status: TaskStatusEnum.PendingReview,
      color: "purple",
    },
    {
      id: "approved",
      title: "Approved",
      status: TaskStatusEnum.Approved,
      color: "cyan",
    },
    {
      id: "done",
      title: "Done",
      status: TaskStatusEnum.Done,
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
 * Get column color classes for status badges and headers
 */
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
  };
  return colors[color] ?? colors.slate;
}
