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
  onTaskContextMenu?: (task: Task, x: number, y: number) => void;
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
  onTaskContextMenu,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const colors = getColumnColorClasses(column.color);
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="w-80 flex flex-col gap-3 shrink-0 h-full">
      {/* Column Header */}
      <div className="flex justify-between items-center px-1">
        <span className={`font-medium text-sm ${colors.text}`}>
          {column.title}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded ${colors.badge}`}>
          {tasks.length}
        </span>
      </div>

      {/* Droppable Task Area - full height for better drop target */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-2
          rounded-lg p-2 transition-colors min-h-[300px]
          ${isOver ? `${colors.bg} ${colors.border} border-2 border-dashed` : "bg-slate-800/30"}
        `}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              onContextMenu={onTaskContextMenu}
            />
          ))}
        </SortableContext>

        {/* Empty state - fills the column for better drop target */}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[250px] text-gray-400 dark:text-gray-500 text-sm">
            {isOver ? "Drop here" : "No tasks"}
          </div>
        )}
      </div>
    </div>
  );
}

export default KanbanColumn;
