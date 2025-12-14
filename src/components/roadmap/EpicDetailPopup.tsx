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
  // Use progressPercentage if available, otherwise calculate from taskStats
  const progress =
    epic.progressPercentage ??
    (taskStats.total > 0
      ? Math.round((taskStats.done / taskStats.total) * 100)
      : 0);

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
          className: "bg-accent-500/20 text-accent-600 dark:text-accent-400",
        };
      default: // PLANNING
        return {
          label: "Planning",
          className:
            "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400",
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
        className="absolute z-50 w-72 bg-white dark:bg-surface-800 rounded-lg shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(-50%, 8px)",
        }}
      >
        {/* Header */}
        <div className="p-3 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-surface-900 dark:text-white text-sm leading-tight">
                {epic.title}
              </h3>
              <span className="text-xs text-surface-500 dark:text-surface-400">
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
              <span className="text-surface-500 dark:text-surface-400">
                Progress
              </span>
              <span className="font-medium text-surface-700 dark:text-surface-300">
                {taskStats.done}/{taskStats.total} tasks ({progress}%)
              </span>
            </div>
            <div className="h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (epic.status as string) === "COMPLETED"
                    ? "bg-semantic-success"
                    : "bg-accent-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Dependencies */}
          {needsEpics.length > 0 && (
            <div>
              <div className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                Depends on ({needsEpics.length})
              </div>
              <div className="space-y-1">
                {needsEpics.map((dep) => (
                  <div
                    key={dep.id}
                    className="text-xs text-surface-700 dark:text-surface-300 truncate"
                  >
                    <span className="text-surface-500 dark:text-surface-400">
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
              <div className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                Blocks ({blocksEpics.length})
              </div>
              <div className="space-y-1">
                {blocksEpics.map((blocker) => (
                  <div
                    key={blocker.id}
                    className="text-xs text-surface-700 dark:text-surface-300 truncate"
                  >
                    <span className="text-surface-500 dark:text-surface-400">
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
            <div className="text-xs text-surface-500 dark:text-surface-400 italic">
              No dependencies
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded transition-colors"
          >
            Close
          </button>
          <button
            onClick={onNavigate}
            className="px-3 py-1.5 text-xs bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </>
  );
}
