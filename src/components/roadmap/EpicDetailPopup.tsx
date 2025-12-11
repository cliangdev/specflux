import type { Epic } from "../../api/generated";

interface EpicDetailPopupProps {
  epic: Epic;
  allEpics: Epic[];
  position: { x: number; y: number };
  onClose: () => void;
  onNavigate: () => void;
}

/**
 * Popup that displays epic details when a node is clicked in the graph.
 * Shows title, status, progress, dependencies (needs), and blocks.
 */
export default function EpicDetailPopup({
  epic,
  allEpics,
  position,
  onClose,
  onNavigate,
}: EpicDetailPopupProps) {
  // Extended Epic type that includes publicId from v2 conversion
  type EpicWithPublicId = Epic & { publicId?: string };

  // Helper to get the epic's unique identifier (publicId for v2, id for v1)
  const getEpicIdentifier = (e: Epic): string => {
    const epicWithPublicId = e as EpicWithPublicId;
    return epicWithPublicId.publicId ?? e.id;
  };

  // Find epics that this epic depends on (Needs)
  const epicDeps = Array.isArray(epic.dependsOn) ? epic.dependsOn : [];
  const needsEpics = epicDeps
    .map((depId) =>
      allEpics.find((e) => getEpicIdentifier(e) === String(depId)),
    )
    .filter((e): e is Epic => e !== undefined);

  // Find epics that depend on this epic (Blocks)
  const currentEpicId = getEpicIdentifier(epic);
  const blocksEpics = allEpics.filter((e) => {
    const deps = Array.isArray(e.dependsOn) ? e.dependsOn : [];
    return deps.some((depId) => String(depId) === currentEpicId);
  });

  const taskStats = epic.taskStats ?? { total: 0, done: 0, inProgress: 0 };
  const progress = epic.progressPercentage ?? 0;

  function getStatusBadge(status: string): {
    label: string;
    className: string;
  } {
    switch (status) {
      case "COMPLETED":
        return {
          label: "Completed",
          className: "bg-semantic-success/20 text-semantic-success",
        };
      case "IN_PROGRESS":
        return {
          label: "In Progress",
          className: "bg-brand-500/20 text-brand-600 dark:text-brand-400",
        };
      default: // PLANNING
        return {
          label: "Planning",
          className:
            "bg-system-200 dark:bg-system-700 text-system-600 dark:text-system-400",
        };
    }
  }

  const statusBadge = getStatusBadge(epic.status);

  return (
    <>
      {/* Backdrop to close popup */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div
        className="absolute z-50 w-72 bg-white dark:bg-system-800 rounded-lg shadow-xl border border-system-200 dark:border-system-700 overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(-50%, 8px)",
        }}
      >
        {/* Header */}
        <div className="p-3 border-b border-system-200 dark:border-system-700">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-system-900 dark:text-white text-sm leading-tight">
                {epic.title}
              </h3>
              <span className="text-xs text-system-500 dark:text-system-400">
                {epic.displayKey}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Progress */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-system-500 dark:text-system-400">
                Progress
              </span>
              <span className="font-medium text-system-700 dark:text-system-300">
                {taskStats.done}/{taskStats.total} tasks ({progress}%)
              </span>
            </div>
            <div className="h-1.5 bg-system-200 dark:bg-system-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (epic.status as string) === "COMPLETED"
                    ? "bg-semantic-success"
                    : "bg-brand-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Dependencies */}
          {needsEpics.length > 0 && (
            <div>
              <div className="text-xs font-medium text-system-600 dark:text-system-400 mb-1">
                Depends on ({needsEpics.length})
              </div>
              <div className="space-y-1">
                {needsEpics.map((dep) => (
                  <div
                    key={dep.id}
                    className="text-xs text-system-700 dark:text-system-300 truncate"
                  >
                    <span className="text-system-500 dark:text-system-400">
                      {dep.displayKey}
                    </span>{" "}
                    {dep.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocks */}
          {blocksEpics.length > 0 && (
            <div>
              <div className="text-xs font-medium text-system-600 dark:text-system-400 mb-1">
                Blocks ({blocksEpics.length})
              </div>
              <div className="space-y-1">
                {blocksEpics.map((blocker) => (
                  <div
                    key={blocker.id}
                    className="text-xs text-system-700 dark:text-system-300 truncate"
                  >
                    <span className="text-system-500 dark:text-system-400">
                      {blocker.displayKey}
                    </span>{" "}
                    {blocker.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No dependencies message */}
          {needsEpics.length === 0 && blocksEpics.length === 0 && (
            <div className="text-xs text-system-500 dark:text-system-400 italic">
              No dependencies
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-system-200 dark:border-system-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-system-600 dark:text-system-400 hover:bg-system-100 dark:hover:bg-system-700 rounded transition-colors"
          >
            Close
          </button>
          <button
            onClick={onNavigate}
            className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </>
  );
}
