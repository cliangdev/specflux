import { useState, useCallback } from "react";
import type { AcceptanceCriteria } from "../../api/generated";
import { api } from "../../api";

interface AcceptanceCriteriaListProps {
  entityType: "task" | "epic";
  projectRef: string;
  entityRef: string;
  criteria: AcceptanceCriteria[];
  onUpdate?: () => void;
  readonly?: boolean;
}

export function AcceptanceCriteriaList({
  entityType,
  projectRef,
  entityRef,
  criteria,
  onUpdate,
  readonly = false,
}: AcceptanceCriteriaListProps) {
  const [newCriterionText, setNewCriterionText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleToggle = useCallback(
    async (criterion: AcceptanceCriteria) => {
      if (readonly) return;
      setUpdating(criterion.id);
      try {
        if (entityType === "task") {
          await api.tasks.updateTaskAcceptanceCriteria({
            projectRef,
            taskRef: entityRef,
            criteriaId: criterion.id,
            updateAcceptanceCriteriaRequest: { isMet: !criterion.isMet },
          });
        } else {
          await api.epics.updateEpicAcceptanceCriteria({
            projectRef,
            epicRef: entityRef,
            criteriaId: criterion.id,
            updateAcceptanceCriteriaRequest: { isMet: !criterion.isMet },
          });
        }
        onUpdate?.();
      } catch (error) {
        console.error("Failed to toggle criterion:", error);
      } finally {
        setUpdating(null);
      }
    },
    [entityType, projectRef, entityRef, onUpdate, readonly],
  );

  const handleAdd = useCallback(async () => {
    if (!newCriterionText.trim() || readonly) return;
    setIsAdding(true);
    try {
      if (entityType === "task") {
        await api.tasks.createTaskAcceptanceCriteria({
          projectRef,
          taskRef: entityRef,
          createAcceptanceCriteriaRequest: {
            criteria: newCriterionText.trim(),
          },
        });
      } else {
        await api.epics.createEpicAcceptanceCriteria({
          projectRef,
          epicRef: entityRef,
          createAcceptanceCriteriaRequest: {
            criteria: newCriterionText.trim(),
          },
        });
      }
      setNewCriterionText("");
      onUpdate?.();
    } catch (error) {
      console.error("Failed to add criterion:", error);
    } finally {
      setIsAdding(false);
    }
  }, [entityType, projectRef, entityRef, newCriterionText, onUpdate, readonly]);

  const handleDelete = useCallback(
    async (criterionId: number) => {
      if (readonly) return;
      setDeleting(criterionId);
      try {
        if (entityType === "task") {
          await api.tasks.deleteTaskAcceptanceCriteria({
            projectRef,
            taskRef: entityRef,
            criteriaId: criterionId,
          });
        } else {
          await api.epics.deleteEpicAcceptanceCriteria({
            projectRef,
            epicRef: entityRef,
            criteriaId: criterionId,
          });
        }
        onUpdate?.();
      } catch (error) {
        console.error("Failed to delete criterion:", error);
      } finally {
        setDeleting(null);
      }
    },
    [entityType, projectRef, entityRef, onUpdate, readonly],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const completedCount = criteria.filter((c) => c.isMet).length;
  const totalCount = criteria.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
          <div className="flex-1 bg-surface-200 dark:bg-surface-700 rounded-full h-1.5 overflow-hidden">
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
                  criterion.isMet
                    ? "bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700"
                    : "border-surface-300 dark:border-surface-600 hover:border-accent-400 dark:hover:border-accent-500"
                } ${readonly ? "cursor-default" : "cursor-pointer"} ${
                  updating === criterion.id ? "opacity-50" : ""
                }`}
              >
                {criterion.isMet && (
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
                  criterion.isMet
                    ? "text-surface-500 dark:text-surface-400 line-through"
                    : "text-surface-700 dark:text-surface-300"
                }`}
              >
                {criterion.criteria}
              </span>
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleDelete(criterion.id)}
                  disabled={deleting === criterion.id}
                  className={`opacity-0 group-hover:opacity-100 p-1 text-surface-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity ${
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
        <p className="text-sm text-surface-400 dark:text-surface-500 italic">
          No acceptance criteria defined
        </p>
      )}

      {/* Add new criterion */}
      {!readonly && (
        <div className="pt-2">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newCriterionText}
              onChange={(e) => setNewCriterionText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add criterion..."
              className="flex-1 min-w-0 text-sm px-2.5 py-1.5 border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              disabled={isAdding}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newCriterionText.trim() || isAdding}
              className="flex-shrink-0 p-1.5 text-white bg-accent-600 hover:bg-accent-700 disabled:bg-surface-300 disabled:dark:bg-surface-600 rounded transition-colors"
              title="Add criterion"
            >
              {isAdding ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">Press Enter to add</p>
        </div>
      )}
    </div>
  );
}
