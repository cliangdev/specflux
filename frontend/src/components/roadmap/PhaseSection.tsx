import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Epic } from "../../api";

export interface PhaseSectionProps {
  phaseNumber: number;
  status: "ready" | "in_progress" | "blocked" | "completed";
  epics: Epic[];
  allEpics: Epic[]; // All epics for dependency lookup
  completedCount: number;
  totalCount: number;
  defaultExpanded?: boolean;
  onEditEpic?: (epic: Epic) => void;
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

interface EpicRowProps {
  epic: Epic;
  allEpics: Epic[];
  isExpanded: boolean;
  onToggle: () => void;
  onViewTasks: () => void;
  onEdit: () => void;
}

function EpicRow({
  epic,
  allEpics,
  isExpanded,
  onToggle,
  onViewTasks,
  onEdit,
}: EpicRowProps) {
  const statusBadge = getEpicStatusBadge(epic.status);

  // Find epics that this epic depends on (Needs)
  const needsEpics = (epic.dependsOn ?? [])
    .map((id) => allEpics.find((e) => e.id === id))
    .filter((e): e is Epic => e !== undefined);

  // Find epics that depend on this epic (Blocks)
  const blocksEpics = allEpics.filter(
    (e) => e.dependsOn?.includes(epic.id) ?? false,
  );

  const taskStats = epic.taskStats ?? { total: 0, done: 0, inProgress: 0 };

  return (
    <div className="card overflow-hidden">
      {/* Epic Header Row */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-system-50 dark:hover:bg-system-700/50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Expand/collapse indicator */}
            <svg
              className={`w-4 h-4 mt-1 text-system-400 transition-transform duration-200 flex-shrink-0 ${
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

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-system-500 dark:text-system-400">
                  #{epic.id}
                </span>
                <h3 className="font-medium text-system-900 dark:text-white truncate">
                  {epic.title}
                </h3>
              </div>
              {epic.description && (
                <p className="text-sm text-system-600 dark:text-system-400 line-clamp-1">
                  {epic.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            {/* Dependency indicators */}
            {needsEpics.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-system-100 dark:bg-system-700 text-system-600 dark:text-system-400">
                {needsEpics.length} dep{needsEpics.length !== 1 ? "s" : ""}
              </span>
            )}

            {/* Task stats */}
            <span className="text-xs text-system-500 dark:text-system-400">
              {taskStats.done}/{taskStats.total} tasks
            </span>

            {/* Status badge */}
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-system-200 dark:border-system-700 bg-system-50 dark:bg-system-800/50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Needs (Dependencies) */}
            <div>
              <h4 className="text-xs font-medium text-system-500 dark:text-system-400 uppercase tracking-wider mb-2">
                Needs (Dependencies)
              </h4>
              {needsEpics.length === 0 ? (
                <p className="text-sm text-system-400 dark:text-system-500 italic">
                  No dependencies
                </p>
              ) : (
                <ul className="space-y-1">
                  {needsEpics.map((e) => {
                    const depStatus = getEpicStatusBadge(e.status);
                    return (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            e.status === "completed"
                              ? "bg-semantic-success"
                              : e.status === "active"
                                ? "bg-brand-500"
                                : "bg-system-400"
                          }`}
                        />
                        <span className="text-system-500 dark:text-system-400">
                          #{e.id}
                        </span>
                        <span className="text-system-900 dark:text-white truncate">
                          {e.title}
                        </span>
                        <span
                          className={`text-xs px-1 py-0.5 rounded ${depStatus.className}`}
                        >
                          {depStatus.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Blocks (Dependents) */}
            <div>
              <h4 className="text-xs font-medium text-system-500 dark:text-system-400 uppercase tracking-wider mb-2">
                Blocks (Dependents)
              </h4>
              {blocksEpics.length === 0 ? (
                <p className="text-sm text-system-400 dark:text-system-500 italic">
                  No dependents
                </p>
              ) : (
                <ul className="space-y-1">
                  {blocksEpics.map((e) => {
                    const depStatus = getEpicStatusBadge(e.status);
                    return (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            e.status === "completed"
                              ? "bg-semantic-success"
                              : e.status === "active"
                                ? "bg-brand-500"
                                : "bg-system-400"
                          }`}
                        />
                        <span className="text-system-500 dark:text-system-400">
                          #{e.id}
                        </span>
                        <span className="text-system-900 dark:text-white truncate">
                          {e.title}
                        </span>
                        <span
                          className={`text-xs px-1 py-0.5 rounded ${depStatus.className}`}
                        >
                          {depStatus.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Task Summary */}
          <div className="mt-4 pt-4 border-t border-system-200 dark:border-system-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-system-600 dark:text-system-400">
                  <span className="font-medium text-system-900 dark:text-white">
                    {taskStats.done}
                  </span>{" "}
                  done
                </span>
                <span className="text-system-600 dark:text-system-400">
                  <span className="font-medium text-brand-600 dark:text-brand-400">
                    {taskStats.inProgress}
                  </span>{" "}
                  in progress
                </span>
                <span className="text-system-600 dark:text-system-400">
                  <span className="font-medium text-system-900 dark:text-white">
                    {(taskStats.total ?? 0) -
                      (taskStats.done ?? 0) -
                      (taskStats.inProgress ?? 0)}
                  </span>{" "}
                  remaining
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewTasks();
                  }}
                  className="btn btn-ghost text-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  View Tasks
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="btn btn-ghost text-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PhaseSection({
  phaseNumber,
  status,
  epics,
  allEpics,
  completedCount,
  totalCount,
  defaultExpanded,
  onEditEpic,
}: PhaseSectionProps) {
  const navigate = useNavigate();
  const [expandedEpicId, setExpandedEpicId] = useState<number | null>(null);

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

  const handleEpicToggle = (epicId: number) => {
    setExpandedEpicId((prev) => (prev === epicId ? null : epicId));
  };

  const handleViewTasks = (epicId: number) => {
    navigate(`/epics/${epicId}`);
  };

  const handleEdit = (epic: Epic) => {
    if (onEditEpic) {
      onEditEpic(epic);
    }
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

      {/* Epics List - Collapsible */}
      {isExpanded && epics.length > 0 && (
        <div className="mt-3 space-y-2 pl-7">
          {epics.map((epic) => (
            <EpicRow
              key={epic.id}
              epic={epic}
              allEpics={allEpics}
              isExpanded={expandedEpicId === epic.id}
              onToggle={() => handleEpicToggle(epic.id)}
              onViewTasks={() => handleViewTasks(epic.id)}
              onEdit={() => handleEdit(epic)}
            />
          ))}
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
