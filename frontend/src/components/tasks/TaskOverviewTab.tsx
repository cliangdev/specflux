import type { Task } from "../../api/generated";

interface TaskOverviewTabProps {
  task: Task;
}

// Parse markdown checklist items from acceptance criteria
function parseChecklist(
  text: string | null | undefined,
): { text: string; checked: boolean }[] {
  if (!text) return [];
  const lines = text.split("\n");
  return lines
    .filter((line) => line.trim().match(/^-\s*\[[ x]\]/i))
    .map((line) => {
      const checked = line.includes("[x]") || line.includes("[X]");
      const text = line.replace(/^-\s*\[[ xX]\]\s*/, "").trim();
      return { text, checked };
    });
}

export default function TaskOverviewTab({ task }: TaskOverviewTabProps) {
  const acceptanceCriteriaItems = parseChecklist(task.acceptanceCriteria);
  const hasAcceptanceCriteria =
    acceptanceCriteriaItems.length > 0 || task.acceptanceCriteria?.trim();

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
        {acceptanceCriteriaItems.length > 0 ? (
          <ul className="space-y-2">
            {acceptanceCriteriaItems.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5 ${
                    item.checked
                      ? "bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700"
                      : "border-system-300 dark:border-system-600"
                  }`}
                >
                  {item.checked && (
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
                </span>
                <span
                  className={`text-sm ${item.checked ? "text-system-500 dark:text-system-400 line-through" : "text-system-700 dark:text-system-300"}`}
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        ) : task.acceptanceCriteria?.trim() ? (
          <div className="text-sm text-system-600 dark:text-system-300 whitespace-pre-wrap">
            {task.acceptanceCriteria}
          </div>
        ) : (
          <p className="text-sm text-system-400 dark:text-system-500 italic">
            No acceptance criteria defined
          </p>
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
