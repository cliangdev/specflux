import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "../../api";
import { getRepoColorClasses } from "./types";

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  onContextMenu?: (task: Task, x: number, y: number) => void;
}

/**
 * Agent status configuration for icons and colors
 */
const AGENT_STATUS_CONFIG: Record<
  string,
  { icon: JSX.Element; color: string; label: string }
> = {
  idle: {
    icon: (
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" strokeDasharray="4 2" />
      </svg>
    ),
    color: "text-slate-400 dark:text-slate-500",
    label: "Idle",
  },
  running: {
    icon: <span className="w-2 h-2 bg-accent-500 rounded-full animate-pulse" />,
    color: "text-accent-500",
    label: "Running",
  },
  paused: {
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
    ),
    color: "text-amber-500 dark:text-amber-400",
    label: "Paused",
  },
  stopped: {
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    ),
    color: "text-slate-500 dark:text-slate-400",
    label: "Stopped",
  },
  completed: {
    icon: (
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    color: "text-emerald-500 dark:text-emerald-400",
    label: "Completed",
  },
  failed: {
    icon: (
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" d="M15 9l-6 6M9 9l6 6" />
      </svg>
    ),
    color: "text-red-500 dark:text-red-400",
    label: "Failed",
  },
};

/**
 * TaskCard - Draggable task card for Kanban board
 *
 * Features:
 * - Task ID badge
 * - Title and description preview with truncation
 * - Dynamic repository color badge
 * - Agent status icon for all states
 * - Blocked indicator with count
 * - Progress bar (when running)
 */
export function TaskCard({ task, onClick, onContextMenu }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Agent status features are not yet implemented in v2 API
  // These will be re-enabled when backend adds support
  const isRunning = false;
  const hasProgress = false;
  const isBlocked = false;
  const statusConfig = AGENT_STATUS_CONFIG.idle;
  // v2 API uses repositoryId instead of repoName - stub for now
  const _repoColors = getRepoColorClasses(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(task, e.clientX, e.clientY);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      onContextMenu={handleContextMenu}
      className={`
        bg-white dark:bg-slate-800 p-4 rounded-lg border shadow-sm
        cursor-pointer transition-all relative overflow-hidden group
        ${
          isDragging
            ? "opacity-50 shadow-lg border-accent-400 dark:border-accent-500"
            : isRunning
              ? "border-accent-300 dark:border-accent-600 shadow-md"
              : isBlocked
                ? "border-amber-300 dark:border-amber-600"
                : "border-gray-200 dark:border-slate-700 hover:border-accent-400 dark:hover:border-accent-500"
        }
      `}
    >
      {/* Progress bar at bottom - will be enabled when v2 API supports agent progress */}
      {hasProgress && (
        <div className="absolute bottom-0 left-0 h-1 bg-gray-200 dark:bg-slate-700 w-full">
          <div
            className="h-full bg-accent-500 transition-all duration-300"
            style={{ width: "0%" }}
          />
        </div>
      )}

      {/* Header: ID, Blocked indicator, and Agent Status */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            #{task.id}
          </span>
          {/* Blocked indicator - will be enabled when v2 API supports dependency counts */}
          {isBlocked && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-medium"
              title="Blocked by incomplete tasks"
            >
              <svg
                className="w-2.5 h-2.5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.757-2.243-5-5-5zm-3 5c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm4 10a1 1 0 11-2 0v-3a1 1 0 112 0v3z" />
              </svg>
            </span>
          )}
        </div>
        {/* Agent status indicator */}
        <div
          className={`flex items-center gap-1 ${statusConfig.color}`}
          title={statusConfig.label}
        >
          {statusConfig.icon}
          {isRunning && (
            <span className="text-[10px] font-medium">Running</span>
          )}
        </div>
      </div>

      {/* Title - truncate to 2 lines for consistent card height, hover for full title */}
      <h3
        className="font-medium text-sm mb-1 text-gray-900 dark:text-gray-100 line-clamp-2"
        title={task.title}
      >
        {task.title}
      </h3>

      {/* Description preview - hover for full description */}
      {task.description && (
        <p
          className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2"
          title={task.description}
        >
          {task.description}
        </p>
      )}

      {/* Footer: Repo tag and avatar */}
      <div className="flex justify-between items-center">
        {/* Repository tag - v2 API uses repositoryId, can look up name later */}
        <span />

        {/* Avatar placeholder - shows when task is assigned */}
        {task.assignedToId && (
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-accent-500 to-cyan-500" />
        )}
      </div>
    </div>
  );
}

export default TaskCard;
