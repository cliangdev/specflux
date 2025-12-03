import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from "@dnd-kit/core";
import { Task, TaskStatusEnum } from "../../api/generated/models/Task";
import { TaskStatus as V2TaskStatus } from "../../api/v2/generated";
import { v2Api } from "../../api/v2/client";
import {
  KanbanColumn as KanbanColumnType,
  WorkflowTemplate,
  getColumnsForWorkflow,
} from "./types";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import {
  ContextMenu,
  ContextMenuItem,
  TerminalIcon,
  DocumentIcon,
} from "../ui/ContextMenu";

interface KanbanBoardProps {
  projectId: number;
  /** Project reference for v2 API (projectKey or id) */
  projectRef?: string;
  workflowTemplate?: WorkflowTemplate;
  onTaskClick?: (task: Task) => void;
  onTaskCreate?: () => void;
  onOpenTerminal?: (task: Task) => void;
}

/**
 * KanbanBoard - Main Kanban board with drag-and-drop
 *
 * Features:
 * - Dynamic columns based on workflow template
 * - Drag-and-drop between columns
 * - Task filtering by status
 * - Real-time status updates
 */
export function KanbanBoard({
  projectId,
  projectRef,
  workflowTemplate = "startup-fast",
  onTaskClick,
  onTaskCreate,
  onOpenTerminal,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    task: Task;
    x: number;
    y: number;
  } | null>(null);

  // Get columns for the workflow template
  const columns = useMemo(
    () => getColumnsForWorkflow(workflowTemplate),
    [workflowTemplate],
  );

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before activating
      },
    }),
  );

  // Load tasks for project using v2 API
  const loadTasks = useCallback(async () => {
    if (!projectRef) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await v2Api.tasks.listTasks({
        projectRef,
        limit: 100,
      });
      // Convert v2 tasks to v1 Task format for KanbanBoard compatibility
      const v2Tasks = response.data ?? [];
      // Map v2 status to v1 status format
      const statusMap: Record<string, TaskStatusEnum> = {
        BACKLOG: TaskStatusEnum.Backlog,
        READY: TaskStatusEnum.Ready,
        IN_PROGRESS: TaskStatusEnum.InProgress,
        PENDING_REVIEW: TaskStatusEnum.PendingReview,
        APPROVED: TaskStatusEnum.Approved,
        DONE: TaskStatusEnum.Done,
      };
      const convertedTasks: Task[] = v2Tasks.map((t) => ({
        id: 0, // v2 uses id as string, but KanbanBoard needs numeric id for drag-drop
        publicId: t.id,
        displayKey: t.displayKey,
        title: t.title,
        description: t.description ?? null,
        status: statusMap[t.status] || TaskStatusEnum.Backlog,
        projectId: 0,
        epicId: null,
        epicDisplayKey: t.epicDisplayKey ?? null,
        repoName: null,
        priority: t.priority,
        requiresApproval: t.requiresApproval,
        progressPercentage: 0, // Required field
        createdByUserId: 0, // Required field
        estimatedDuration: t.estimatedDuration ?? null,
        actualDuration: t.actualDuration ?? null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        githubPrUrl: t.githubPrUrl ?? null,
      }));
      setTasks(convertedTasks);
    } catch (err) {
      setError("Failed to load tasks");
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [projectRef]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Group tasks by status for each column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    for (const column of columns) {
      grouped[column.id] = tasks.filter((t) => t.status === column.status);
    }
    return grouped;
  }, [tasks, columns]);

  // Find column by status
  const findColumnByStatus = useCallback(
    (status: TaskStatusEnum): KanbanColumnType | undefined => {
      return columns.find((c) => c.status === status);
    },
    [columns],
  );

  // Context menu handlers
  const handleTaskContextMenu = useCallback(
    (task: Task, x: number, y: number) => {
      setContextMenu({ task, x, y });
    },
    [],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleOpenTerminal = useCallback(() => {
    if (contextMenu) {
      onOpenTerminal?.(contextMenu.task);
      setContextMenu(null);
    }
  }, [contextMenu, onOpenTerminal]);

  const handleViewDetails = useCallback(() => {
    if (contextMenu) {
      onTaskClick?.(contextMenu.task);
      setContextMenu(null);
    }
  }, [contextMenu, onTaskClick]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as number;
    const task = tasks.find((t) => t.id === taskId);
    setActiveTask(task ?? null);
  };

  // Handle drag end - update task status using v2 API
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over || !projectRef) return;

    // Use publicId (stored as id string from v2) to find task
    const taskIdentifier = active.id;
    const task = tasks.find(
      (t) => (t as Task & { publicId?: string }).publicId === taskIdentifier,
    );
    if (!task) return;

    // Find the target column (over can be column id or another task)
    let targetColumnId = over.id as string;

    // If dropped over a task, find its column
    const overTask = tasks.find(
      (t) => (t as Task & { publicId?: string }).publicId === over.id,
    );
    if (overTask) {
      const column = findColumnByStatus(overTask.status);
      if (column) {
        targetColumnId = column.id;
      }
    }

    // Find target column and get new status
    const targetColumn = columns.find((c) => c.id === targetColumnId);
    if (!targetColumn) return;

    // Skip if status hasn't changed
    if (task.status === targetColumn.status) return;

    // Optimistically update UI
    setTasks((prev) =>
      prev.map((t) => {
        const matches =
          (t as Task & { publicId?: string }).publicId === taskIdentifier;
        return matches ? { ...t, status: targetColumn.status } : t;
      }),
    );

    // Update on server using v2 API
    try {
      // Convert status to v2 format (UPPER_CASE)
      const v2Status = targetColumn.status.toUpperCase() as V2TaskStatus;
      await v2Api.tasks.updateTask({
        projectRef,
        taskRef: taskIdentifier as string,
        updateTaskRequest: { status: v2Status },
      });
    } catch (err) {
      console.error("Failed to update task status:", err);
      // Revert on error
      loadTasks();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={loadTasks}
          className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Board Header - matches TasksPage styling */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-system-900 dark:text-white">
          Board
        </h1>
        <div className="flex items-center gap-2">
          {onTaskCreate && (
            <button onClick={onTaskCreate} className="btn btn-primary">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Task
            </button>
          )}
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="h-full flex gap-6 min-w-max">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id] ?? []}
                onTaskClick={onTaskClick}
                onTaskContextMenu={handleTaskContextMenu}
              />
            ))}
          </div>

          {/* Drag Overlay - shows dragged task */}
          <DragOverlay>
            {activeTask && (
              <div className="opacity-80">
                <TaskCard task={activeTask} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
        >
          <ContextMenuItem
            icon={<TerminalIcon />}
            label="Open in Terminal"
            onClick={handleOpenTerminal}
          />
          <ContextMenuItem
            icon={<DocumentIcon />}
            label="View Details"
            onClick={handleViewDetails}
          />
        </ContextMenu>
      )}
    </div>
  );
}

export default KanbanBoard;
