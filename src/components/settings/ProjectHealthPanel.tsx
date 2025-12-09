import { useState } from "react";
import {
  type HealthCheckItem,
  type HealthStatus,
  getPlatform,
  getGitInstallInstructions,
  getClaudeCliInstallInstructions,
} from "../../services/systemDeps";

interface ProjectHealthPanelProps {
  status: HealthStatus;
  items: HealthCheckItem[];
  onRefresh: () => Promise<void>;
  onChangeLocalPath?: () => void;
  loading?: boolean;
}

// Status dot colors only - minimal visual noise
const statusDotClass = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

const statusLabel = {
  healthy: "All set",
  warning: "Almost ready",
  error: "Needs setup",
};

export function ProjectHealthPanel({
  status,
  items,
  onRefresh,
  onChangeLocalPath,
  loading = false,
}: ProjectHealthPanelProps) {
  const [showInstallGuide, setShowInstallGuide] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(status !== "healthy"); // Auto-expand if not healthy

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const requiredItems = items.filter((item) => item.required);
  const recommendedItems = items.filter((item) => !item.required);

  // Count completed items
  const completedCount = items.filter((item) => item.status === "ok").length;
  const totalCount = items.length;

  const renderItemStatus = (item: HealthCheckItem) => {
    if (item.status === "ok") {
      return (
        <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    } else if (item.status === "warning") {
      return (
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
      );
    } else {
      return (
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
      );
    }
  };

  const renderItemAction = (item: HealthCheckItem) => {
    if (item.status === "ok") return null;

    if (item.name === "Local Path" && onChangeLocalPath) {
      return (
        <button
          onClick={onChangeLocalPath}
          className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Configure
        </button>
      );
    }

    if (item.name === "Git" || item.name === "Claude CLI") {
      return (
        <button
          onClick={() => setShowInstallGuide(item.name)}
          className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          How to install
        </button>
      );
    }

    return null;
  };

  const renderItem = (item: HealthCheckItem) => (
    <div
      key={item.name}
      className="flex items-center justify-between py-1.5"
    >
      <div className="flex items-center gap-2">
        {renderItemStatus(item)}
        <span className={`text-sm ${item.status === "ok" ? "text-gray-500 dark:text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
          {item.name}
        </span>
        {item.status === "ok" && item.message && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {item.message}
          </span>
        )}
      </div>
      {renderItemAction(item)}
    </div>
  );

  if (loading) {
    return (
      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Checking setup...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {/* Collapsible Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${statusDotClass[status]}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Setup Checklist
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {completedCount}/{totalCount} complete
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {statusLabel[status]}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700">
            {/* Required Items */}
            {requiredItems.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                  Required
                </div>
                <div className="space-y-0.5">{requiredItems.map(renderItem)}</div>
              </div>
            )}

            {/* Recommended Items */}
            {recommendedItems.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                  Recommended
                </div>
                <div className="space-y-0.5">{recommendedItems.map(renderItem)}</div>
              </div>
            )}

            {/* Refresh button */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700/50">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
              >
                <svg
                  className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {refreshing ? "Checking..." : "Re-check"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Install {showInstallGuide}
              </h3>
              <button
                onClick={() => setShowInstallGuide(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {showInstallGuide === "Git"
                  ? "Git is required for cloning and managing repositories."
                  : "Claude CLI is required to run AI agents on your tasks."}
              </p>

              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {showInstallGuide === "Git"
                  ? getGitInstallInstructions(getPlatform())
                  : getClaudeCliInstallInstructions()}
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                After installing, click "Check Again" to verify.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowInstallGuide(null)}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowInstallGuide(null);
                  handleRefresh();
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
              >
                Check Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
