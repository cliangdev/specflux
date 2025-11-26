import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Epic } from "../../api";

export interface PhaseSectionProps {
  phaseNumber: number;
  status: "ready" | "in_progress" | "blocked" | "completed";
  epics: Epic[];
  completedCount: number;
  totalCount: number;
  defaultExpanded?: boolean;
}

function getPhaseStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-semantic-success/20 text-semantic-success border-semantic-success/30";
    case "in_progress":
      return "bg-brand-500/20 text-brand-600 dark:text-brand-400 border-brand-500/30";
    case "blocked":
      return "bg-semantic-warning/20 text-semantic-warning border-semantic-warning/30";
    default:
      return "bg-system-200 dark:bg-system-700 text-system-600 dark:text-system-400 border-system-300 dark:border-system-600";
  }
}

function getPhaseStatusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Complete";
    case "in_progress":
      return "In Progress";
    case "blocked":
      return "Blocked";
    default:
      return "Ready";
  }
}

function getEpicStatusBadge(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        className: "bg-semantic-success/20 text-semantic-success",
      };
    case "active":
      return {
        label: "Active",
        className: "bg-brand-500/20 text-brand-600 dark:text-brand-400",
      };
    default:
      return {
        label: "Planning",
        className:
          "bg-system-200 dark:bg-system-700 text-system-600 dark:text-system-400",
      };
  }
}

export function PhaseSection({
  phaseNumber,
  status,
  epics,
  completedCount,
  totalCount,
  defaultExpanded,
}: PhaseSectionProps) {
  const navigate = useNavigate();

  // Determine initial expanded state:
  // - Phases 1 and 2 expanded by default
  // - Blocked phases collapsed by default
  // - Can be overridden by defaultExpanded prop
  const getInitialExpanded = () => {
    if (defaultExpanded !== undefined) return defaultExpanded;
    if (status === "blocked") return false;
    return phaseNumber <= 2;
  };

  const [isExpanded, setIsExpanded] = useState(getInitialExpanded);

  // Update expanded state when status changes (e.g., phase becomes blocked)
  useEffect(() => {
    if (status === "blocked" && defaultExpanded === undefined) {
      setIsExpanded(false);
    }
  }, [status, defaultExpanded]);

  const handleEpicClick = (epicId: number) => {
    navigate(`/epics/${epicId}`);
  };

  const statusColor = getPhaseStatusColor(status);
  const statusLabel = getPhaseStatusLabel(status);

  return (
    <div className="mb-4">
      {/* Phase Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-system-50 dark:bg-system-800 hover:bg-system-100 dark:hover:bg-system-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Expand/collapse indicator */}
          <svg
            className={`w-4 h-4 text-system-500 transition-transform duration-200 ${
              isExpanded ? "rotate-90" : ""
            }`}
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

          {/* Phase badge */}
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}
          >
            Phase {phaseNumber}
          </div>

          {/* Status label */}
          <span className="text-sm text-system-600 dark:text-system-400">
            {statusLabel}
          </span>
        </div>

        {/* Completion count */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-system-500 dark:text-system-400">
            {completedCount}/{totalCount} complete
          </span>

          {/* Progress indicator */}
          {totalCount > 0 && (
            <div className="w-16 h-1.5 bg-system-200 dark:bg-system-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  status === "completed"
                    ? "bg-semantic-success"
                    : status === "blocked"
                      ? "bg-semantic-warning"
                      : "bg-brand-500"
                }`}
                style={{
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          )}
        </div>
      </button>

      {/* Epics Grid - Collapsible */}
      {isExpanded && epics.length > 0 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-7">
          {epics.map((epic) => {
            const statusBadge = getEpicStatusBadge(epic.status);
            return (
              <button
                key={epic.id}
                onClick={() => handleEpicClick(epic.id)}
                className="card text-left hover:border-brand-500 dark:hover:border-brand-400 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-system-900 dark:text-white line-clamp-2">
                    {epic.title}
                  </h3>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${statusBadge.className}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>
                {epic.description && (
                  <p className="text-sm text-system-600 dark:text-system-400 line-clamp-2">
                    {epic.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state when expanded but no epics */}
      {isExpanded && epics.length === 0 && (
        <div className="mt-3 pl-7">
          <p className="text-sm text-system-500 dark:text-system-400 italic">
            No epics in this phase
          </p>
        </div>
      )}
    </div>
  );
}

export default PhaseSection;
