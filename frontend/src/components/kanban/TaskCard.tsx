import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, TaskAgentStatusEnum } from "../../api/generated/models/Task";

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

/**
 * TaskCard - Draggable task card for Kanban board
 *
 * Design follows mock.html with:
 * - Task ID badge
 * - Title and description preview
 * - Repository tag
 * - Progress bar (when running)
 * - Running indicator animation
 */
export function TaskCard({ task, onClick }: TaskCardProps) {
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

  const isRunning = task.agentStatus === TaskAgentStatusEnum.Running;
  const hasProgress = (task.progressPercentage ?? 0) > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      className={`
        bg-white dark:bg-slate-800 p-4 rounded-lg border shadow-sm
        cursor-pointer transition-all relative overflow-hidden group
        ${
          isDragging
            ? "opacity-50 shadow-lg border-brand-400 dark:border-brand-500"
            : isRunning
              ? "border-brand-300 dark:border-brand-600 shadow-md"
              : "border-gray-200 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-500"
        }
      `}
    >
      {/* Progress bar at bottom */}
      {hasProgress && (
        <div className="absolute bottom-0 left-0 h-1 bg-gray-200 dark:bg-slate-700 w-full">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${task.progressPercentage}%` }}
          />
        </div>
      )}

      {/* Header: ID and Running Status */}
      <div className="flex justify-between mb-2">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          #{task.id}
        </span>
        {isRunning && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-brand-500 font-medium">
              Running
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-gray-100">
        {task.title}
      </h3>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer: Repo tag */}
      <div className="flex justify-between items-center">
        {task.repoName ? (
          <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] border border-purple-200 dark:border-purple-800">
            {task.repoName}
          </span>
        ) : (
          <span />
        )}

        {/* Avatar placeholder - can be enhanced with assignee info */}
        {task.assignedToUserId && (
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-brand-500 to-cyan-500" />
        )}
      </div>
    </div>
  );
}

export default TaskCard;
