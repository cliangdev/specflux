import { useState, useRef, useEffect } from "react";
import type { Epic, Release } from "../../api/generated";

// Extended epic type for v2 support
type EpicWithV2Fields = Epic & {
  displayKey?: string;
};

// Status configuration
const STATUS_CONFIG: Record<
  string,
  { label: string; icon: JSX.Element; classes: string; dropdownClasses: string }
> = {
  PLANNING: {
    label: "Planning",
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
  IN_PROGRESS: {
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
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    classes:
      "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border-brand-200 dark:border-brand-800",
    dropdownClasses: "hover:bg-brand-50 dark:hover:bg-brand-900/20",
  },
  COMPLETED: {
    label: "Completed",
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

const STATUSES = ["PLANNING", "IN_PROGRESS", "COMPLETED"] as const;

interface EpicDetailHeaderProps {
  epic: EpicWithV2Fields;
  releases: Release[];
  phase: number;
  onStatusChange: (status: string) => void;
  onTitleChange: (title: string) => void;
  onReleaseChange: (releaseId: number | null) => void;
  onDelete: () => void;
  onBack: () => void;
  deleting?: boolean;
}

export default function EpicDetailHeader({
  epic,
  releases,
  phase,
  onStatusChange,
  onTitleChange,
  onReleaseChange,
  onDelete,
  onBack,
  deleting = false,
}: EpicDetailHeaderProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [releaseDropdownOpen, setReleaseDropdownOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(epic.title);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const releaseDropdownRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
      if (
        releaseDropdownRef.current &&
        !releaseDropdownRef.current.contains(event.target as Node)
      ) {
        setReleaseDropdownOpen(false);
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

  // Sync title value when epic changes
  useEffect(() => {
    setTitleValue(epic.title);
  }, [epic.title]);

  const handleTitleSave = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== epic.title) {
      onTitleChange(trimmed);
    } else {
      setTitleValue(epic.title);
    }
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setTitleValue(epic.title);
      setEditingTitle(false);
    }
  };

  const currentStatus =
    STATUS_CONFIG[epic.status as string] || STATUS_CONFIG.PLANNING;
  const currentRelease = releases.find((r) => r.id === epic.releaseId);

  return (
    <div className="space-y-3 mb-4">
      {/* Row 1: Back, ID, Title, Delete */}
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
          {epic.displayKey}
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
            {epic.title}
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

      {/* Row 2: Status Dropdown, Release Dropdown, Phase Badge */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status Dropdown */}
        <div className="relative" ref={statusDropdownRef}>
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
                const isSelected = (epic.status as string) === status;
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

        {/* Release Dropdown */}
        <div className="relative" ref={releaseDropdownRef}>
          <button
            onClick={() => setReleaseDropdownOpen(!releaseDropdownOpen)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded border transition-colors ${
              currentRelease
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                : "bg-system-100 text-system-600 dark:bg-system-800 dark:text-system-400 border-system-200 dark:border-system-700"
            }`}
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
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            {currentRelease ? currentRelease.name : "No Release"}
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
          {releaseDropdownOpen && (
            <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-system-800 rounded-lg shadow-lg border border-system-200 dark:border-system-700 py-1">
              <button
                onClick={() => {
                  onReleaseChange(null);
                  setReleaseDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-system-100 dark:hover:bg-system-700 ${
                  !epic.releaseId ? "bg-system-100 dark:bg-system-700" : ""
                }`}
              >
                <span
                  className={
                    !epic.releaseId
                      ? "font-medium text-system-900 dark:text-white"
                      : "text-system-600 dark:text-system-400"
                  }
                >
                  No Release
                </span>
                {!epic.releaseId && (
                  <svg
                    className="w-4 h-4 text-brand-600 dark:text-brand-400"
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
              {releases.map((release) => {
                const isSelected = epic.releaseId === release.id;
                return (
                  <button
                    key={release.id}
                    onClick={() => {
                      onReleaseChange(release.id);
                      setReleaseDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-system-100 dark:hover:bg-system-700 ${
                      isSelected ? "bg-system-100 dark:bg-system-700" : ""
                    }`}
                  >
                    <span
                      className={
                        isSelected
                          ? "font-medium text-system-900 dark:text-white"
                          : "text-system-700 dark:text-system-300"
                      }
                    >
                      {release.name}
                    </span>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-brand-600 dark:text-brand-400"
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

        {/* Phase Badge */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded bg-system-100 dark:bg-system-800 text-system-600 dark:text-system-400 border border-system-200 dark:border-system-700">
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Phase {phase}
        </span>
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
                Delete Epic
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-system-600 dark:text-system-300">
                Are you sure you want to delete{" "}
                <span className="font-medium text-system-900 dark:text-white">
                  {epic.title}
                </span>
                ? This action cannot be undone. Tasks linked to this epic will
                be unlinked but not deleted.
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
