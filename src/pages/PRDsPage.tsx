import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../contexts/ProjectContext";
import { usePageContext } from "../hooks/usePageContext";
import { api, type Prd, PrdStatus } from "../api";
import PrdImportModal from "../components/ui/PrdImportModal";
import { CreatePrdModal } from "../components/prds/CreatePrdModal";
import { StatusBadge } from "../components/ui/StatusBadge";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: PrdStatus.Draft, label: "Draft" },
  { value: PrdStatus.InReview, label: "In Review" },
  { value: PrdStatus.Approved, label: "Approved" },
  { value: PrdStatus.Implemented, label: "Implemented" },
  { value: PrdStatus.Archived, label: "Archived" },
];

export default function PRDsPage() {
  const navigate = useNavigate();
  const { currentProject, getProjectRef } = useProject();
  const [prds, setPrds] = useState<Prd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Set page context for terminal suggested commands
  usePageContext({ type: "prds" });

  const loadPrds = useCallback(async () => {
    const projectRef = getProjectRef();
    if (!projectRef) {
      setPrds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.prds.listPrds({
        projectRef,
        status: statusFilter ? (statusFilter as PrdStatus) : undefined,
        limit: 100,
      });
      setPrds(response.data ?? []);
    } catch (err) {
      console.error("Failed to load PRDs:", err);
      setError(err instanceof Error ? err.message : "Failed to load PRDs");
    } finally {
      setLoading(false);
    }
  }, [getProjectRef, statusFilter]);

  useEffect(() => {
    loadPrds();
  }, [loadPrds]);

  const handlePrdClick = (prd: Prd) => {
    // Navigate using the PRD's publicId or displayKey
    navigate(`/prds/${encodeURIComponent(prd.id)}`);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter PRDs by search query (client-side)
  const filteredPrds = prds.filter((prd) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      prd.title.toLowerCase().includes(query) ||
      prd.description?.toLowerCase().includes(query) ||
      prd.displayKey.toLowerCase().includes(query)
    );
  });

  const hasActiveFilters = statusFilter !== "" || searchQuery !== "";

  // No project selected
  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <div className="text-surface-500 dark:text-surface-400 text-lg">
          No project selected
        </div>
        <p className="text-surface-400 dark:text-surface-500 mt-2">
          Select a project from the dropdown above
        </p>
      </div>
    );
  }

  // No local path configured
  if (!currentProject.localPath) {
    return (
      <div className="text-center py-12 card">
        <svg
          className="mx-auto h-12 w-12 text-amber-500 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-surface-700 dark:text-surface-300">
          Project Path Not Set
        </h3>
        <p className="mt-2 text-surface-500">
          Set the local path for this project to manage PRDs.
        </p>
        <button
          onClick={() => navigate("/settings")}
          className="mt-4 btn btn-primary"
        >
          Go to Settings
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
          PRDs
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select min-w-[120px]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search PRDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 min-w-[160px]"
            />
          </div>

          {/* Import button */}
          <button
            className="btn btn-ghost"
            onClick={() => setShowImportModal(true)}
            title="Import PRD"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>

          {/* Refresh button */}
          <button onClick={loadPrds} className="btn btn-ghost" title="Refresh">
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Create button */}
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create PRD
          </button>
        </div>
      </div>

      {/* Filter summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-4 text-sm text-surface-500 dark:text-surface-400">
          <span>
            Showing {filteredPrds.length} of {prds.length} PRDs
          </span>
          <button
            onClick={() => {
              setStatusFilter("");
              setSearchQuery("");
            }}
            className="text-accent-600 dark:text-accent-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin w-8 h-8 text-accent-500"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 dark:text-red-400 text-lg">
            Error loading PRDs
          </div>
          <p className="text-surface-500 mt-2">{error}</p>
          <button onClick={loadPrds} className="mt-4 btn btn-primary">
            Try Again
          </button>
        </div>
      ) : filteredPrds.length === 0 ? (
        <div className="text-center py-12 card">
          <svg
            className="mx-auto h-12 w-12 text-surface-400 dark:text-surface-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-surface-700 dark:text-surface-300">
            No PRDs
          </h3>
          <p className="mt-2 text-surface-500">
            {hasActiveFilters
              ? "No PRDs match the selected filters."
              : "Get started by creating your first PRD."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrds.map((prd) => (
            <button
              key={prd.id}
              onClick={() => handlePrdClick(prd)}
              className="card text-left p-4 hover:border-accent-500 dark:hover:border-accent-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-accent-600 dark:text-accent-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-surface-400 dark:text-surface-500 font-mono">
                      {prd.displayKey}
                    </span>
                    <StatusBadge status={prd.status} size="sm" />
                  </div>
                  <h3 className="font-medium text-surface-900 dark:text-white truncate group-hover:text-accent-600 dark:group-hover:text-accent-400">
                    {prd.title}
                  </h3>
                  {prd.description && (
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 line-clamp-2">
                      {prd.description}
                    </p>
                  )}
                  <p className="text-xs text-surface-400 dark:text-surface-500 mt-2">
                    {prd.documentCount ?? 0}{" "}
                    {(prd.documentCount ?? 0) === 1 ? "document" : "documents"}{" "}
                    · {formatDate(prd.updatedAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Import PRD Modal (legacy) */}
      {showImportModal && currentProject?.localPath && getProjectRef() && (
        <PrdImportModal
          projectPath={currentProject.localPath}
          projectRef={getProjectRef()!}
          onClose={() => setShowImportModal(false)}
          onImported={loadPrds}
        />
      )}

      {/* Create PRD Modal */}
      {showCreateModal && currentProject?.localPath && getProjectRef() && (
        <CreatePrdModal
          projectPath={currentProject.localPath}
          projectRef={getProjectRef()!}
          onClose={() => setShowCreateModal(false)}
          onCreated={(prdId, hasDocument) => {
            // Navigate to PRD detail page with flag indicating if we should show getting started
            navigate(`/prds/${encodeURIComponent(prdId)}`, {
              state: { showGettingStarted: true, hasDocument },
            });
          }}
        />
      )}
    </div>
  );
}
