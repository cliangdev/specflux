import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { EpicNodeData } from "./transformEpicsToGraph";

/**
 * Get border and background colors based on epic status
 */
function getStatusStyles(status: string): {
  borderColor: string;
  bgColor: string;
  iconColor: string;
} {
  switch (status) {
    case "completed":
      return {
        borderColor: "border-semantic-success",
        bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
        iconColor: "text-semantic-success",
      };
    case "active":
      return {
        borderColor: "border-brand-500",
        bgColor: "bg-blue-100 dark:bg-blue-900/50",
        iconColor: "text-brand-600 dark:text-brand-400",
      };
    default: // planning
      return {
        borderColor: "border-system-300 dark:border-system-600",
        bgColor: "bg-system-100 dark:bg-system-800",
        iconColor: "text-system-500 dark:text-system-400",
      };
  }
}

/**
 * Get status icon and label
 */
function getStatusDisplay(status: string): {
  icon: JSX.Element;
  label: string;
} {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        icon: (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    case "active":
      return {
        label: "Active",
        icon: (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    default: // planning
      return {
        label: "Planning",
        icon: (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        ),
      };
  }
}

/**
 * Truncate text with ellipsis if exceeding maxLength
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Custom React Flow node for displaying epics in the dependency graph.
 * Shows title (truncated), progress bar, and status with visual styling.
 */
function EpicNode({ data, selected }: NodeProps<EpicNodeData>) {
  const { label, progress, status, totalTasks, doneTasks } = data;
  const styles = getStatusStyles(status);
  const statusDisplay = getStatusDisplay(status);

  return (
    <div
      className={`
        w-[240px] rounded-lg border-2 shadow-sm transition-all
        ${styles.borderColor} ${styles.bgColor}
        ${selected ? "ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-system-900" : ""}
        hover:shadow-md
      `}
    >
      {/* Input handle (top) - for dependencies flowing in */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-system-400 dark:!bg-system-500 !w-3 !h-3 !border-2 !border-white dark:!border-system-800"
      />

      <div className="p-3">
        {/* Title */}
        <h3
          className="font-medium text-system-900 dark:text-white text-sm leading-tight mb-2"
          title={label}
        >
          {truncateText(label, 28)}
        </h3>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-system-500 dark:text-system-400">
              Progress
            </span>
            <span className="font-medium text-system-700 dark:text-system-300">
              {progress}%
            </span>
          </div>
          <div className="h-1.5 bg-system-200 dark:bg-system-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status === "completed" ? "bg-semantic-success" : "bg-brand-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status and task count */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 ${styles.iconColor}`}>
            {statusDisplay.icon}
            <span className="text-xs font-medium">{statusDisplay.label}</span>
          </div>
          <span className="text-xs text-system-500 dark:text-system-400">
            {doneTasks}/{totalTasks} tasks
          </span>
        </div>
      </div>

      {/* Output handle (bottom) - for dependencies flowing out */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-system-400 dark:!bg-system-500 !w-3 !h-3 !border-2 !border-white dark:!border-system-800"
      />
    </div>
  );
}

// Memo the component for performance in large graphs
export default memo(EpicNode);
