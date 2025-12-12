interface PaginationProps {
  /** Total number of items */
  total: number;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Next cursor for pagination */
  nextCursor?: string | null;
  /** Previous cursor for pagination */
  prevCursor?: string | null;
  /** Number of items currently displayed */
  currentCount: number;
  /** Loading state */
  loading?: boolean;
  /** Callback when next page is requested */
  onLoadMore?: () => void;
  /** Callback when previous page is requested */
  onLoadPrevious?: () => void;
  /** Text label for items (e.g., "tasks", "epics") */
  itemLabel?: string;
}

export default function Pagination({
  total,
  hasMore,
  nextCursor,
  prevCursor,
  currentCount,
  loading = false,
  onLoadMore,
  onLoadPrevious,
  itemLabel = "items",
}: PaginationProps) {
  const showPrevious = prevCursor && onLoadPrevious;
  const showNext = hasMore && nextCursor && onLoadMore;

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
      <div className="text-sm text-surface-500 dark:text-surface-400">
        Showing{" "}
        <span className="font-medium text-surface-700 dark:text-surface-300">
          {currentCount}
        </span>{" "}
        of{" "}
        <span className="font-medium text-surface-700 dark:text-surface-300">
          {total}
        </span>{" "}
        {itemLabel}
      </div>

      <div className="flex items-center gap-2">
        {showPrevious && (
          <button
            onClick={onLoadPrevious}
            disabled={loading}
            className="btn btn-ghost text-sm"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Previous
          </button>
        )}

        {showNext && (
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="btn btn-ghost text-sm"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin w-4 h-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </>
            ) : (
              <>
                Load More
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
