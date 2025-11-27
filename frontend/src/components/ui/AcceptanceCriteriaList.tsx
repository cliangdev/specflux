import { useState, useCallback } from "react";
import type { AcceptanceCriterion } from "../../api/generated";
import { api } from "../../api";

interface AcceptanceCriteriaListProps {
  entityType: "task" | "epic";
  entityId: number;
  criteria: AcceptanceCriterion[];
  onUpdate?: () => void;
  readonly?: boolean;
}

export function AcceptanceCriteriaList({
  entityType,
  entityId,
  criteria,
  onUpdate,
  readonly = false,
}: AcceptanceCriteriaListProps) {
  const [newCriterionText, setNewCriterionText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleToggle = useCallback(
    async (criterion: AcceptanceCriterion) => {
      if (readonly) return;
      setUpdating(criterion.id);
      try {
        if (entityType === "task") {
          await api.tasks.updateTaskCriterion({
            id: entityId,
            criterionId: criterion.id,
            updateCriterionRequest: { checked: !criterion.checked },
          });
        } else {
          await api.epics.updateEpicCriterion({
            id: entityId,
            criterionId: criterion.id,
            updateCriterionRequest: { checked: !criterion.checked },
          });
        }
        onUpdate?.();
      } catch (error) {
        console.error("Failed to toggle criterion:", error);
      } finally {
        setUpdating(null);
      }
    },
    [entityType, entityId, onUpdate, readonly],
  );

  const handleAdd = useCallback(async () => {
    if (!newCriterionText.trim() || readonly) return;
    setIsAdding(true);
    try {
      if (entityType === "task") {
        await api.tasks.createTaskCriterion({
          id: entityId,
          createCriterionRequest: { text: newCriterionText.trim() },
        });
      } else {
        await api.epics.createEpicCriterion({
          id: entityId,
          createCriterionRequest: { text: newCriterionText.trim() },
        });
      }
      setNewCriterionText("");
      onUpdate?.();
    } catch (error) {
      console.error("Failed to add criterion:", error);
    } finally {
      setIsAdding(false);
    }
  }, [entityType, entityId, newCriterionText, onUpdate, readonly]);

  const handleDelete = useCallback(
    async (criterionId: number) => {
      if (readonly) return;
      setDeleting(criterionId);
      try {
        if (entityType === "task") {
          await api.tasks.deleteTaskCriterion({
            id: entityId,
            criterionId,
          });
        } else {
          await api.epics.deleteEpicCriterion({
            id: entityId,
            criterionId,
          });
        }
        onUpdate?.();
      } catch (error) {
        console.error("Failed to delete criterion:", error);
      } finally {
        setDeleting(null);
      }
    },
    [entityType, entityId, onUpdate, readonly],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const completedCount = criteria.filter((c) => c.checked).length;
  const totalCount = criteria.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-system-500 dark:text-system-400">
          <div className="flex-1 bg-system-200 dark:bg-system-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span>
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Criteria list */}
      {criteria.length > 0 ? (
        <ul className="space-y-2">
          {criteria.map((criterion) => (
            <li
              key={criterion.id}
              className="flex items-start gap-2 group"
              data-testid={`criterion-${criterion.id}`}
            >
              <button
                type="button"
                onClick={() => handleToggle(criterion)}
                disabled={readonly || updating === criterion.id}
                className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-colors ${
                  criterion.checked
                    ? "bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700"
                    : "border-system-300 dark:border-system-600 hover:border-brand-400 dark:hover:border-brand-500"
                } ${readonly ? "cursor-default" : "cursor-pointer"} ${
                  updating === criterion.id ? "opacity-50" : ""
                }`}
              >
                {criterion.checked && (
                  <svg
                    className="w-3 h-3 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  criterion.checked
                    ? "text-system-500 dark:text-system-400 line-through"
                    : "text-system-700 dark:text-system-300"
                }`}
              >
                {criterion.text}
              </span>
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleDelete(criterion.id)}
                  disabled={deleting === criterion.id}
                  className={`opacity-0 group-hover:opacity-100 p-1 text-system-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity ${
                    deleting === criterion.id ? "opacity-50" : ""
                  }`}
                  title="Delete criterion"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-system-400 dark:text-system-500 italic">
          No acceptance criteria defined
        </p>
      )}

      {/* Add new criterion */}
      {!readonly && (
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={newCriterionText}
            onChange={(e) => setNewCriterionText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add acceptance criterion..."
            className="flex-1 text-sm px-3 py-1.5 border border-system-300 dark:border-system-600 rounded bg-white dark:bg-system-800 text-system-900 dark:text-white placeholder-system-400 dark:placeholder-system-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            disabled={isAdding}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newCriterionText.trim() || isAdding}
            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:bg-system-300 disabled:dark:bg-system-600 rounded transition-colors"
          >
            {isAdding ? "Adding..." : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}
