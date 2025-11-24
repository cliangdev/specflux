import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Task } from "../../api/generated/models/Task";
import {
  KanbanColumn as KanbanColumnType,
  getColumnColorClasses,
} from "./types";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

/**
 * KanbanColumn - Droppable column for Kanban board
 *
 * Features:
 * - Column header with title and task count
 * - Droppable area for task cards
 * - Scrollable task list
 * - Color-coded based on column type
 */
export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const colors = getColumnColorClasses(column.color);
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="w-80 flex flex-col gap-3 shrink-0">
      {/* Column Header */}
      <div className="flex justify-between items-center px-1">
        <span className={`font-medium text-sm ${colors.text}`}>
          {column.title}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded ${colors.badge}`}>
          {tasks.length}
        </span>
      </div>

      {/* Droppable Task Area */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-2 min-h-[200px]
          rounded-lg p-2 transition-colors
          ${isOver ? `${colors.bg} ${colors.border} border-2 border-dashed` : ""}
        `}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
            No tasks
          </div>
        )}

        {/* Drop indicator */}
        {isOver && tasks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export default KanbanColumn;
