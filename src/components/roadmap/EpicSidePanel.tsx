import { Link } from "react-router-dom";
import type { Epic } from "../../api/generated";
import { AIActionButton } from "../ui/AIActionButton";
import { StatusBadge } from "../ui/StatusBadge";
import { ProgressBar } from "../ui";

interface EpicSidePanelProps {
  epic: Epic;
  allEpics: Epic[];
  onClose: () => void;
  onStartWork: () => void;
  onContinueWork?: () => void;
  hasExistingSession: boolean;
  isTerminalActive: boolean;
}

/**
 * Side panel that displays epic details in a split panel layout.
 * Shows title, status, progress, dependencies, and actions.
 */
export function EpicSidePanel({
  epic,
  allEpics,
  onClose,
  onStartWork,
  onContinueWork,
  hasExistingSession,
  isTerminalActive,
}: EpicSidePanelProps) {
  // Extended Epic type that includes publicId from v2 conversion
  type EpicWithPublicId = Epic & { publicId?: string };

  // Helper to get the epic's unique identifier
  const getEpicIdentifier = (e: Epic): string => {
    const epicWithPublicId = e as EpicWithPublicId;
    return epicWithPublicId.publicId ?? e.id;
  };

  // Find epics that this epic depends on
  const epicDeps = Array.isArray(epic.dependsOn) ? epic.dependsOn : [];
  const needsEpics = epicDeps
    .map((depId) =>
      allEpics.find((e) => getEpicIdentifier(e) === String(depId)),
    )
    .filter((e): e is Epic => e !== undefined);

  // Find epics that depend on this epic
  const currentEpicId = getEpicIdentifier(epic);
  const blocksEpics = allEpics.filter((e) => {
    const deps = Array.isArray(e.dependsOn) ? e.dependsOn : [];
    return deps.some((depId) => String(depId) === currentEpicId);
  });

  const taskStats = epic.taskStats ?? { total: 0, done: 0, inProgress: 0 };
  const progress = epic.progressPercentage ?? 0;

  return (
    <div className="w-80 flex-shrink-0 border-l border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-mono text-surface-500 dark:text-surface-400">
              {epic.displayKey}
            </span>
            <h3 className="font-semibold text-surface-900 dark:text-white text-base leading-tight mt-1">
              {epic.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-2">
          <StatusBadge status={epic.status} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* AI Action */}
        <AIActionButton
          entityType="epic"
          entityId={epic.id}
          entityTitle={epic.title}
          hasExistingSession={hasExistingSession}
          isTerminalActive={isTerminalActive}
          onStartWork={onStartWork}
          onContinueWork={onContinueWork}
          className="w-full"
        />

        {/* Progress */}
        <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-surface-500 dark:text-surface-400">Progress</span>
            <span className="font-medium text-surface-700 dark:text-surface-300">
              {taskStats.done}/{taskStats.total} tasks
            </span>
          </div>
          <ProgressBar percent={progress} size="md" showLabel />
        </div>

        {/* Description */}
        {epic.description && (
          <div>
            <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase mb-2">
              Description
            </h4>
            <p className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
              {epic.description}
            </p>
          </div>
        )}

        {/* Dependencies */}
        {needsEpics.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase mb-2">
              Depends on ({needsEpics.length})
            </h4>
            <div className="space-y-1">
              {needsEpics.map((dep) => (
                <Link
                  key={dep.id}
                  to={`/epics/${dep.id}`}
                  className="block text-sm text-surface-700 dark:text-surface-300 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                >
                  <span className="text-surface-500 dark:text-surface-400 font-mono text-xs">
                    {dep.displayKey}
                  </span>{" "}
                  {dep.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Blocks */}
        {blocksEpics.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase mb-2">
              Blocks ({blocksEpics.length})
            </h4>
            <div className="space-y-1">
              {blocksEpics.map((blocker) => (
                <Link
                  key={blocker.id}
                  to={`/epics/${blocker.id}`}
                  className="block text-sm text-surface-700 dark:text-surface-300 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                >
                  <span className="text-surface-500 dark:text-surface-400 font-mono text-xs">
                    {blocker.displayKey}
                  </span>{" "}
                  {blocker.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No dependencies */}
        {needsEpics.length === 0 && blocksEpics.length === 0 && (
          <p className="text-sm text-surface-500 dark:text-surface-400 italic">
            No dependencies
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-surface-200 dark:border-surface-700 flex-shrink-0">
        <Link
          to={`/epics/${epic.id}`}
          className="btn btn-secondary w-full text-sm"
        >
          View Full Details
        </Link>
      </div>
    </div>
  );
}
