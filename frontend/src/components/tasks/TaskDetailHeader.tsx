import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Task, Epic, User, Agent } from "../../api/generated";
import type { ReadinessResult } from "../../utils/readiness";
import ProgressBar from "../ui/ProgressBar";
import OwnerExecutorBadge from "./OwnerExecutorBadge";
import AgentSelector from "./AgentSelector";

// Status configuration
const STATUS_CONFIG: Record<
  string,
  { label: string; icon: JSX.Element; classes: string; dropdownClasses: string }
> = {
  backlog: {
    label: "Backlog",
    icon: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    ),
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    dropdownClasses: "hover:bg-slate-100 dark:hover:bg-slate-800",
  },
  ready: {
    label: "Ready",
    icon: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="10" strokeDasharray="4 2" />
      </svg>
    ),
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    dropdownClasses: "hover:bg-slate-100 dark:hover:bg-slate-800",
  },
  in_progress: {
    label: "In Progress",
    icon: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    classes:
      "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border-brand-200 dark:border-brand-800",
    dropdownClasses: "hover:bg-brand-50 dark:hover:bg-brand-900/20",
  },
  pending_review: {
    label: "Pending Review",
    icon: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
    classes:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dropdownClasses: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
  },
  approved: {
    label: "Approved",
    icon: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dropdownClasses: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
  },
  done: {
    label: "Done",
    icon: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dropdownClasses: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
  },
};

const STATUSES = [
  "backlog",
  "ready",
  "in_progress",
  "pending_review",
  "approved",
  "done",
] as const;

interface TaskDetailHeaderProps {
  task: Task;
  epic?: Epic | null;
  owner?: User | null;
  readiness: ReadinessResult;
  onStatusChange: (status: string) => void;
  onAgentChange: (agentId: number | null, agent: Agent | null) => void;
  onEdit: () => void;
  onBack: () => void;
}

export default function TaskDetailHeader({
  task,
  epic,
  owner,
  readiness,
  onStatusChange,
  onAgentChange,
  onEdit,
  onBack,
}: TaskDetailHeaderProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentStatus = STATUS_CONFIG[task.status] || STATUS_CONFIG.backlog;

  return (
    <div className="space-y-3 mb-4">
      {/* Row 1: Back, ID, Title, Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-system-500 hover:text-system-700 dark:text-system-400 dark:hover:text-white transition-colors flex-shrink-0"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <div className="h-6 w-px bg-system-200 dark:bg-system-700 flex-shrink-0" />
        <span className="text-system-500 dark:text-system-400 text-sm font-mono flex-shrink-0">
          #{task.id}
        </span>
        <h1 className="text-xl font-semibold text-system-900 dark:text-white truncate flex-1 min-w-0">
          {task.title}
        </h1>
        <button
          onClick={onEdit}
          className="p-1.5 text-system-400 hover:text-system-600 dark:hover:text-white transition-colors rounded hover:bg-system-100 dark:hover:bg-system-700 flex-shrink-0"
          title="Edit task"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      </div>

      {/* Row 2: Status Dropdown, Epic, Owner/Executor */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Status Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded border ${currentStatus.classes} transition-colors`}
          >
            {currentStatus.icon}
            {currentStatus.label}
            <svg
              className="w-3.5 h-3.5 ml-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {statusDropdownOpen && (
            <div className="absolute z-50 mt-1 w-44 bg-white dark:bg-system-800 rounded-lg shadow-lg border border-system-200 dark:border-system-700 py-1">
              {STATUSES.map((status) => {
                const config = STATUS_CONFIG[status];
                const isSelected = task.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(status);
                      setStatusDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${config.dropdownClasses} ${
                      isSelected ? "bg-system-100 dark:bg-system-700" : ""
                    }`}
                  >
                    <span
                      className={
                        isSelected
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-system-500 dark:text-system-400"
                      }
                    >
                      {config.icon}
                    </span>
                    <span
                      className={
                        isSelected
                          ? "font-medium text-system-900 dark:text-white"
                          : "text-system-700 dark:text-system-300"
                      }
                    >
                      {config.label}
                    </span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 ml-auto text-brand-600 dark:text-brand-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Epic Link */}
        {epic && (
          <Link
            to={`/epics/${epic.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            {epic.title}
          </Link>
        )}

        {/* Separator */}
        <div className="h-5 w-px bg-system-200 dark:bg-system-700" />

        {/* Agent Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-system-500 dark:text-system-400">
            Agent:
          </span>
          <AgentSelector
            projectId={task.projectId}
            selectedAgentId={task.assignedAgentId}
            onChange={onAgentChange}
            variant="inline"
          />
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-system-200 dark:bg-system-700" />

        {/* Owner/Executor Badge */}
        <OwnerExecutorBadge
          owner={owner}
          ownerUserId={task.ownerUserId}
          executorType={task.executorType}
        />
      </div>

      {/* Row 3: Readiness Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <ProgressBar percent={readiness.score} size="sm" />
        </div>
        <span className="text-sm text-system-600 dark:text-system-400 tabular-nums">
          {readiness.score}% Ready
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded ${
            readiness.isReady
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          }`}
        >
          {readiness.isReady ? (
            <>
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              READY
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              NOT READY
            </>
          )}
        </span>
      </div>
    </div>
  );
}
