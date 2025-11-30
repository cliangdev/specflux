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
    </div>
  );
}
