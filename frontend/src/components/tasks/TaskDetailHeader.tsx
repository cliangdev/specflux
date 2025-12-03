import { useState, useRef, useEffect } from "react";
import type { Task, Agent } from "../../api/generated";
import AgentSelector from "./AgentSelector";
import EpicSelector from "./EpicSelector";

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

// Extended task type for v2 support
type TaskWithV2Fields = Omit<Task, "epicId"> & {
  v2Id?: string;
  displayKey?: string;
  epicId?: number | string | null;
  epicDisplayKey?: string;
  priority?: string;
};

interface TaskDetailHeaderProps {
  task: TaskWithV2Fields;
  /** v2 project reference (projectKey or id) */
  projectRef?: string;
  onStatusChange: (status: string) => void;
  onEpicChange: (epicId: number | string | null) => void;
  onAgentChange: (agentId: number | null, agent: Agent | null) => void;
  onTitleChange: (title: string) => void;
  onDelete: () => void;
  onBack: () => void;
  deleting?: boolean;
}

export default function TaskDetailHeader({
  task,
  projectRef,
  onStatusChange,
  onEpicChange,
  onAgentChange,
  onTitleChange,
  onDelete,
  onBack,
  deleting = false,
}: TaskDetailHeaderProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  // Focus input when editing starts
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // Sync title value when task changes
  useEffect(() => {
    setTitleValue(task.title);
  }, [task.title]);

  const handleTitleSave = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.title) {
      onTitleChange(trimmed);
    } else {
      setTitleValue(task.title);
    }
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setTitleValue(task.title);
      setEditingTitle(false);
    }
  };

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
        {editingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="text-xl font-semibold text-system-900 dark:text-white flex-1 min-w-0 bg-transparent border-b-2 border-brand-500 outline-none"
          />
        ) : (
          <h1
            onClick={() => setEditingTitle(true)}
            className="text-xl font-semibold text-system-900 dark:text-white truncate flex-1 min-w-0 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            title="Click to edit"
          >
            {task.title}
          </h1>
        )}
        <button
          onClick={() => setConfirmingDelete(true)}
          className="btn btn-danger flex-shrink-0"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
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

        {/* Epic Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-system-500 dark:text-system-400">
            Epic:
          </span>
          <EpicSelector
            projectId={task.projectId}
            projectRef={projectRef}
            selectedEpicId={task.epicId}
            onChange={onEpicChange}
          />
        </div>

        {/* Agent Selector (v1 API for local features) */}
        <>
          {/* Separator */}
          <div className="h-5 w-px bg-system-200 dark:bg-system-700" />

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
        </>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setConfirmingDelete(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-system-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-system-200 dark:border-system-700">
            <div className="px-6 py-4 border-b border-system-200 dark:border-system-700">
              <h2 className="text-lg font-semibold text-system-900 dark:text-white">
                Delete Task
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-system-600 dark:text-system-300">
                Are you sure you want to delete{" "}
                <span className="font-medium text-system-900 dark:text-white">
                  {task.title}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-system-200 dark:border-system-700">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-system-600 dark:text-system-300 hover:text-system-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="btn btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
