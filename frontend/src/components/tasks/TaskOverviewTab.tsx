import { useState, useEffect, useCallback } from "react";
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

  const handleCriteriaUpdate = () => {
    fetchCriteria();
    onTaskUpdate?.();
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <h3 className="text-sm font-semibold text-system-900 dark:text-white mb-2">
          Description
        </h3>
        <div className="text-sm text-system-600 dark:text-system-300 leading-relaxed whitespace-pre-wrap">
          {task.description || (
            <span className="text-system-400 dark:text-system-500 italic">
              No description provided
            </span>
          )}
        </div>
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

      {/* Scope */}
      <div className="grid grid-cols-2 gap-4">
        {/* Scope In */}
        <div>
          <h3 className="text-sm font-semibold text-system-900 dark:text-white mb-2 flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            In Scope
          </h3>
          {task.scopeIn ? (
            <div className="text-sm text-system-600 dark:text-system-300 whitespace-pre-wrap">
              {task.scopeIn}
            </div>
          ) : (
            <p className="text-sm text-system-400 dark:text-system-500 italic">
              Not specified
            </p>
          )}
        </div>

        {/* Scope Out */}
        <div>
          <h3 className="text-sm font-semibold text-system-900 dark:text-white mb-2 flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Out of Scope
          </h3>
          {task.scopeOut ? (
            <div className="text-sm text-system-600 dark:text-system-300 whitespace-pre-wrap">
              {task.scopeOut}
            </div>
          ) : (
            <p className="text-sm text-system-400 dark:text-system-500 italic">
              Not specified
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
