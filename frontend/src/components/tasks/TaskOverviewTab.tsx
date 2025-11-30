import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, AcceptanceCriterion } from "../../api/generated";
import { api } from "../../api";
import { AcceptanceCriteriaList } from "../ui/AcceptanceCriteriaList";

interface TaskOverviewTabProps {
  task: Task;
  onTaskUpdate?: () => void;
}

export default function TaskOverviewTab({
  task,
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
      const response = await api.tasks.listTaskCriteria({ id: task.id });
      setCriteria(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch criteria:", err);
    } finally {
      setCriteriaLoading(false);
    }
  }, [task.id]);

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
        await api.tasks.updateTask({
          id: task.id,
          updateTaskRequest: { description: trimmed || null },
        });
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
        <h3 className="text-sm font-semibold text-system-900 dark:text-white mb-2">
          Description
        </h3>
        {editingDescription ? (
          <div className="space-y-2">
            <textarea
              ref={descriptionRef}
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onKeyDown={handleDescriptionKeyDown}
              className="input w-full min-h-[100px] resize-y"
              placeholder="Enter description..."
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleDescriptionSave}
                className="btn btn-primary text-sm py-1"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setDescriptionValue(task.description || "");
                  setEditingDescription(false);
                }}
                className="btn btn-secondary text-sm py-1"
              >
                Cancel
              </button>
              <span className="text-xs text-system-400 dark:text-system-500">
                Ctrl+Enter to save, Esc to cancel
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setEditingDescription(true)}
            className="text-sm text-system-600 dark:text-system-300 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-system-50 dark:hover:bg-system-800 rounded p-2 -m-2 transition-colors"
            title="Click to edit"
          >
            {descriptionValue || (
              <span className="text-system-400 dark:text-system-500 italic">
                Click to add description...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Acceptance Criteria */}
      <div>
        <h3 className="text-sm font-semibold text-system-900 dark:text-white mb-2">
          Acceptance Criteria
        </h3>
        {criteriaLoading ? (
          <div className="text-sm text-system-400 dark:text-system-500">
            Loading...
          </div>
        ) : (
          <AcceptanceCriteriaList
            entityType="task"
            entityId={task.id}
            criteria={criteria}
            onUpdate={handleCriteriaUpdate}
          />
        )}
      </div>
    </div>
  );
}
