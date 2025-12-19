import { useState, useEffect, useCallback, useRef } from "react";
import {
  api,
  type Task,
  type AcceptanceCriteria as AcceptanceCriterion,
} from "../../api";
import { AcceptanceCriteriaList } from "../ui/AcceptanceCriteriaList";
import MarkdownRenderer from "../ui/MarkdownRenderer";

// Extended task type for v2 support
type TaskWithV2Fields = Omit<Task, "epicId"> & {
  v2Id?: string;
  displayKey?: string;
  epicId?: number | string | null;
  epicDisplayKey?: string;
  priority?: string;
};

interface TaskOverviewTabProps {
  task: TaskWithV2Fields;
  /** v2 project reference (projectKey or id) */
  projectRef?: string;
  onTaskUpdate?: () => void;
}

export default function TaskOverviewTab({
  task,
  projectRef,
  onTaskUpdate,
}: TaskOverviewTabProps) {
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(true);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(
    task.description || "",
  );
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const fetchCriteria = useCallback(async () => {
    try {
      setCriteriaLoading(true);
      if (projectRef && task.v2Id) {
        // Use v2 API
        const response = await api.tasks.listTaskAcceptanceCriteria({
          projectRef,
          taskRef: task.v2Id,
        });
        const v2Criteria = response.data ?? [];
        // Use v2 criteria directly
        setCriteria(v2Criteria as unknown as AcceptanceCriterion[]);
      } else {
        // Fallback to v2 API with string projectId
        const response = await api.tasks.listTaskAcceptanceCriteria({
          projectRef: String(task.projectId),
          taskRef: task.id,
        });
        const v2Criteria = response.data ?? [];
        // Use v2 criteria directly
        setCriteria(v2Criteria as unknown as AcceptanceCriterion[]);
      }
    } catch (err) {
      console.error("Failed to fetch criteria:", err);
    } finally {
      setCriteriaLoading(false);
    }
  }, [task.id, task.v2Id, projectRef]);

  useEffect(() => {
    fetchCriteria();
  }, [fetchCriteria]);

  // Sync description when task changes
  useEffect(() => {
    setDescriptionValue(task.description || "");
  }, [task.description]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus();
      descriptionRef.current.setSelectionRange(
        descriptionRef.current.value.length,
        descriptionRef.current.value.length,
      );
    }
  }, [editingDescription]);

  const handleCriteriaUpdate = () => {
    fetchCriteria();
    onTaskUpdate?.();
  };

  const handleDescriptionSave = async () => {
    const trimmed = descriptionValue.trim();
    const oldDescription = task.description || "";

    // Always exit editing mode
    setEditingDescription(false);

    if (trimmed !== oldDescription) {
      // Optimistically update local state
      setDescriptionValue(trimmed);

      try {
        // JSON Merge Patch: null = clear, value = set, absent = don't change
        // Cast needed because TypeScript types don't include null for nullable fields
        if (projectRef && task.v2Id) {
          await api.tasks.updateTask({
            projectRef,
            taskRef: task.v2Id,
            updateTaskRequest: { description: (trimmed || null) as string | undefined },
          });
        } else {
          // Fallback: Use projectId as projectRef string
          await api.tasks.updateTask({
            projectRef: String(task.projectId),
            taskRef: task.id,
            updateTaskRequest: { description: (trimmed || null) as string | undefined },
          });
        }
        onTaskUpdate?.();
      } catch (err) {
        console.error("Failed to update description:", err);
        // Revert on error
        setDescriptionValue(oldDescription);
      }
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDescriptionValue(task.description || "");
      setEditingDescription(false);
    }
    // Ctrl/Cmd + Enter to save
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleDescriptionSave();
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-surface-900 dark:text-white">
            Description
          </h3>
          {!editingDescription && (
            <button
              onClick={() => setEditingDescription(true)}
              className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              title="Edit description"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
        {editingDescription ? (
          <div className="h-[120px] border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-800 flex flex-col">
            <textarea
              ref={descriptionRef}
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onKeyDown={handleDescriptionKeyDown}
              className="flex-1 w-full p-3 text-sm text-surface-700 dark:text-surface-300 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-accent-500 focus:ring-inset rounded-t-md"
              placeholder="Enter description..."
            />
            <div className="flex items-center gap-2 px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 rounded-b-md">
              <button
                onClick={handleDescriptionSave}
                className="btn btn-primary text-xs py-1 px-2"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setDescriptionValue(task.description || "");
                  setEditingDescription(false);
                }}
                className="btn btn-secondary text-xs py-1 px-2"
              >
                Cancel
              </button>
              <span className="text-xs text-surface-400 dark:text-surface-500">
                Ctrl+Enter to save
              </span>
            </div>
          </div>
        ) : (
          <div className="min-h-[60px] p-3 border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-800">
            {descriptionValue ? (
              <MarkdownRenderer
                source={descriptionValue}
                className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
              />
            ) : (
              <p className="text-sm text-surface-400 dark:text-surface-500 italic">
                No description
              </p>
            )}
          </div>
        )}
      </div>

      {/* Acceptance Criteria */}
      <div>
        <h3 className="text-sm font-medium text-surface-900 dark:text-white mb-2">
          Acceptance Criteria
        </h3>
        {criteriaLoading ? (
          <div className="text-sm text-surface-400 dark:text-surface-500">
            Loading...
          </div>
        ) : (
          <AcceptanceCriteriaList
            entityType="task"
            projectRef={projectRef ?? ""}
            entityRef={task.v2Id ?? String(task.id)}
            criteria={criteria}
            onUpdate={handleCriteriaUpdate}
          />
        )}
      </div>
    </div>
  );
}
