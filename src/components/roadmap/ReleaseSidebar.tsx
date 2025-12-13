import type { Release, ReleaseStatus } from "../../api/generated/models";

interface ReleaseSidebarProps {
  releases: Release[];
  selectedReleaseId: string | null;
  onSelectRelease: (releaseId: string) => void;
  onCreateRelease: () => void;
  epicCounts?: Record<string, number>;
}

function getStatusIndicator(status: ReleaseStatus): { icon: string; className: string } {
  switch (status) {
    case "RELEASED":
      return { icon: "●", className: "text-semantic-success" };
    case "IN_PROGRESS":
      return { icon: "▶", className: "text-accent-500" };
    case "CANCELLED":
      return { icon: "×", className: "text-surface-400" };
    default: // PLANNED
      return { icon: "○", className: "text-surface-400" };
  }
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function ReleaseSidebar({
  releases,
  selectedReleaseId,
  onSelectRelease,
  onCreateRelease,
  epicCounts = {},
}: ReleaseSidebarProps) {
  return (
    <div className="w-60 border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
          Releases
        </h2>
      </div>

      {/* Release List */}
      <div className="flex-1 overflow-y-auto p-2">
        {releases.length === 0 ? (
          <div className="text-center py-8 text-sm text-surface-500 dark:text-surface-400">
            No releases yet
          </div>
        ) : (
          <div className="space-y-1">
            {releases.map((release) => {
              const isSelected = selectedReleaseId === release.id;
              const indicator = getStatusIndicator(release.status);
              const epicCount = epicCounts[release.id] ?? 0;

              return (
                <button
                  key={release.id}
                  onClick={() => onSelectRelease(release.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? "bg-accent-100 dark:bg-accent-900/30 border border-accent-200 dark:border-accent-800"
                      : "hover:bg-surface-100 dark:hover:bg-surface-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-sm ${indicator.className}`}>
                      {indicator.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${
                        isSelected
                          ? "text-accent-700 dark:text-accent-300"
                          : "text-surface-900 dark:text-white"
                      }`}>
                        {release.name}
                      </div>
                      <div className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                        {formatDate(release.targetDate)} · {epicCount} epic{epicCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Release Button */}
      <div className="p-3 border-t border-surface-200 dark:border-surface-700">
        <button
          onClick={onCreateRelease}
          className="w-full btn btn-ghost text-sm justify-center"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Release
        </button>
      </div>
    </div>
  );
}
