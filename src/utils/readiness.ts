import { Task } from "../api/generated";

export interface ReadinessCriteria {
  hasTitle: boolean;
  hasDescription: boolean;
  hasAcceptanceCriteria: boolean;
  dependenciesResolved: boolean;
  hasRepo: boolean;
  hasExecutor: boolean;
}

export interface ReadinessResult {
  /** Readiness score from 0-100 */
  score: number;
  /** Whether all criteria are met (score === 100) */
  isReady: boolean;
  /** Individual criteria status */
  criteria: ReadinessCriteria;
  /** Labels for display */
  criteriaLabels: {
    key: keyof ReadinessCriteria;
    label: string;
    met: boolean;
  }[];
}

/**
 * Calculate the Definition of Ready (DoR) score for a task.
 * Based on PRD criteria:
 * - Clear title
 * - Description provided
 * - Acceptance criteria defined
 * - Dependencies resolved (not blocked)
 * - Repository assigned
 * - Executor assigned (human or agent)
 */
export function calculateReadiness(task: Task): ReadinessResult {
  // Note: v2 API doesn't have acceptanceCriteria field yet
  const hasAcceptanceCriteria = false;

  const criteria: ReadinessCriteria = {
    hasTitle: !!task.title?.trim(),
    hasDescription: !!task.description?.trim(),
    hasAcceptanceCriteria,
    dependenciesResolved: true, // blockedByCount not available in v2 API yet
    hasRepo: false, // repoName not available in v2 API yet
    hasExecutor: !!task.assignedToId, // executorType not available in v2 API yet
  };

  const criteriaLabels: ReadinessResult["criteriaLabels"] = [
    { key: "hasTitle", label: "Title", met: criteria.hasTitle },
    {
      key: "hasDescription",
      label: "Description",
      met: criteria.hasDescription,
    },
    {
      key: "hasAcceptanceCriteria",
      label: "Acceptance Criteria",
      met: criteria.hasAcceptanceCriteria,
    },
    {
      key: "dependenciesResolved",
      label: "Dependencies Resolved",
      met: criteria.dependenciesResolved,
    },
    { key: "hasRepo", label: "Repository Assigned", met: criteria.hasRepo },
    {
      key: "hasExecutor",
      label: "Executor Assigned",
      met: criteria.hasExecutor,
    },
  ];

  const completed = Object.values(criteria).filter(Boolean).length;
  const total = Object.keys(criteria).length;
  const score = Math.round((completed / total) * 100);

  return {
    score,
    isReady: score === 100,
    criteria,
    criteriaLabels,
  };
}
