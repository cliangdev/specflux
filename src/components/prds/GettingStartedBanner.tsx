interface GettingStartedBannerProps {
  prdId: string;
  hasDocument: boolean;
  onDraftWithClaude: () => void;
  onRefineWithClaude: () => void;
  onCreateEpics: () => void;
  onAddDocs: () => void;
  onDismiss: () => void;
}

export function GettingStartedBanner({
  hasDocument,
  onDraftWithClaude,
  onRefineWithClaude,
  onCreateEpics,
  onAddDocs,
  onDismiss,
}: GettingStartedBannerProps) {
  return (
    <div className="mb-6 p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <h3 className="font-semibold text-surface-900 dark:text-white">
            Getting Started
          </h3>
        </div>
        <button
          onClick={onDismiss}
          className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
          title="Dismiss"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
        Your PRD has been created. Here are your next steps:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Draft/Refine with Claude */}
        <button
          onClick={hasDocument ? onRefineWithClaude : onDraftWithClaude}
          className="flex flex-col items-center p-4 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-accent-500 dark:hover:border-accent-500 hover:shadow-sm transition-all text-center group"
        >
          <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mb-2 group-hover:bg-accent-200 dark:group-hover:bg-accent-900/50 transition-colors">
            <svg
              className="w-5 h-5 text-accent-600 dark:text-accent-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <span className="font-medium text-surface-900 dark:text-white text-sm">
            {hasDocument ? "Refine with Claude" : "Draft with Claude"}
          </span>
          <span className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            {hasDocument
              ? "Improve and expand your PRD"
              : "Research and write your PRD"}
          </span>
        </button>

        {/* Create Epics */}
        <button
          onClick={onCreateEpics}
          className="flex flex-col items-center p-4 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-accent-500 dark:hover:border-accent-500 hover:shadow-sm transition-all text-center group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
            <svg
              className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <span className="font-medium text-surface-900 dark:text-white text-sm">
            Create Epics
          </span>
          <span className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Break down into implementable epics
          </span>
        </button>

        {/* Add Documents */}
        <button
          onClick={onAddDocs}
          className="flex flex-col items-center p-4 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-accent-500 dark:hover:border-accent-500 hover:shadow-sm transition-all text-center group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </div>
          <span className="font-medium text-surface-900 dark:text-white text-sm">
            Add Documents
          </span>
          <span className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Attach wireframes or mockups
          </span>
        </button>
      </div>
    </div>
  );
}
