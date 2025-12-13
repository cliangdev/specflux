import type { TerminalSession } from "../../contexts/TerminalContext";

interface DuplicateSessionDialogProps {
  existingSession: TerminalSession;
  onOpenExisting: () => void;
  onCancel: () => void;
}

/**
 * Warning dialog shown when user tries to create a session
 * for a context that already has an active session.
 */
export default function DuplicateSessionDialog({
  existingSession,
  onOpenExisting,
  onCancel,
}: DuplicateSessionDialogProps) {
  // Use displayKey if available, otherwise fall back to title (for workshops) or ID
  const displayKey =
    existingSession.displayKey ||
    (existingSession.contextType === "prd-workshop"
      ? existingSession.contextTitle
      : `#${existingSession.contextId}`);
  const title = existingSession.contextTitle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-surface-200 dark:border-surface-700"
        role="dialog"
        aria-labelledby="duplicate-session-title"
        data-testid="duplicate-session-dialog"
      >
        <div className="px-6 py-5">
          {/* Warning icon and title */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <span className="text-2xl" aria-hidden="true">⚠️</span>
            </div>
            <div className="flex-1">
              <h2
                id="duplicate-session-title"
                className="text-lg font-semibold text-surface-900 dark:text-white"
              >
                Session already exists for {displayKey}
              </h2>
              <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
                You already have an active session for "{title}".
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 rounded-b-lg">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors"
            data-testid="duplicate-session-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onOpenExisting}
            className="btn btn-primary"
            data-testid="duplicate-session-open"
          >
            Open Existing
          </button>
        </div>
      </div>
    </div>
  );
}
