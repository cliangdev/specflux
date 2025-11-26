import type { ReadinessResult, ReadinessCriteria } from "../../utils/readiness";

interface ReadinessChecklistProps {
  readiness: ReadinessResult;
  onAddCriteria?: () => void;
  onAssignExecutor?: () => void;
  onAssignRepo?: () => void;
}

// Check icon (met)
const CheckIcon = () => (
  <svg
    className="w-4 h-4 text-emerald-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// X icon (missing)
const XIcon = () => (
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
);

// Hourglass icon (pending/blocked)
const HourglassIcon = () => (
  <svg
    className="w-4 h-4 text-amber-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// Get the appropriate icon based on criteria key and met status
function getCriteriaIcon(key: keyof ReadinessCriteria, met: boolean) {
  if (met) {
    return <CheckIcon />;
  }
  // Dependencies use hourglass when not resolved (pending state)
  if (key === "dependenciesResolved") {
    return <HourglassIcon />;
  }
  return <XIcon />;
}

// Get actionable text for missing criteria
function getMissingText(key: keyof ReadinessCriteria): string {
  switch (key) {
    case "hasTitle":
      return "Add a clear title";
    case "hasDescription":
      return "Add a description";
    case "hasAcceptanceCriteria":
      return "Define acceptance criteria";
    case "dependenciesResolved":
      return "Complete blocking tasks";
    case "hasRepo":
      return "Assign a repository";
    case "hasExecutor":
      return "Assign an executor";
    default:
      return "Complete this requirement";
  }
}

export default function ReadinessChecklist({
  readiness,
  onAddCriteria,
  onAssignExecutor,
  onAssignRepo,
}: ReadinessChecklistProps) {
  const missingCriteria = readiness.criteriaLabels.filter((c) => !c.met);
  const metCriteria = readiness.criteriaLabels.filter((c) => c.met);

  return (
    <div className="space-y-3">
      {/* Criteria List */}
      <div className="space-y-1.5">
        {readiness.criteriaLabels.map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
              item.met
                ? "bg-emerald-50 dark:bg-emerald-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            }`}
          >
            {getCriteriaIcon(item.key, item.met)}
            <span
              className={
                item.met
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-red-700 dark:text-red-300"
              }
            >
              {item.label}
            </span>
            {!item.met && (
              <span className="ml-auto text-xs text-system-500 dark:text-system-400">
                {getMissingText(item.key)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Missing Summary & Quick Actions */}
      {missingCriteria.length > 0 && (
        <div className="pt-2 border-t border-system-200 dark:border-system-700">
          <p className="text-xs text-system-500 dark:text-system-400 mb-2">
            {missingCriteria.length} of {readiness.criteriaLabels.length}{" "}
            criteria missing
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {!readiness.criteria.hasAcceptanceCriteria && onAddCriteria && (
              <button
                onClick={onAddCriteria}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 rounded hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Criteria
              </button>
            )}
            {!readiness.criteria.hasExecutor && onAssignExecutor && (
              <button
                onClick={onAssignExecutor}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 rounded hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Assign Executor
              </button>
            )}
            {!readiness.criteria.hasRepo && onAssignRepo && (
              <button
                onClick={onAssignRepo}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 rounded hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                Assign Repo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ready Message */}
      {readiness.isReady && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <svg
            className="w-5 h-5 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Task is ready to start!
          </span>
        </div>
      )}
    </div>
  );
}
