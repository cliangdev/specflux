import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { StatusBadge, StatusOption } from "./StatusBadge";

// Inline SVG icons
const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const MoreVerticalIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
    />
  </svg>
);

export interface Badge {
  label: string;
  value: string;
  href?: string;
}

export interface Action {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}

export interface DetailPageHeaderProps {
  // Navigation
  backLabel?: string; // Optional, defaults to "Back"
  backTo: string;

  // Entity info
  entityKey: string;
  title: string;
  onTitleChange?: (title: string) => void;

  // Status
  status: string;
  statusOptions: StatusOption[];
  onStatusChange?: (status: string) => void;

  // Context badges (optional)
  badges?: Badge[];

  // Metadata
  createdAt?: Date | string;
  updatedAt?: Date | string;

  // Primary action slot (for AIActionButton)
  primaryAction?: React.ReactNode;

  // Delete action (visible button)
  onDelete?: () => void;
  deleting?: boolean;

  // Actions menu (for additional actions)
  actions?: Action[];

  // Loading state
  isLoading?: boolean;
}

function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DetailPageHeader({
  backLabel = "Back",
  backTo,
  entityKey,
  title,
  onTitleChange,
  status,
  statusOptions,
  onStatusChange,
  badges,
  createdAt,
  updatedAt,
  primaryAction,
  onDelete,
  deleting = false,
  actions,
  isLoading = false,
}: DetailPageHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Update edited title when prop changes
  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Close actions menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target as Node)
      ) {
        setShowActionsMenu(false);
      }
    }

    if (showActionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showActionsMenu]);

  const handleTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle !== title && onTitleChange) {
      onTitleChange(editedTitle.trim());
    } else {
      setEditedTitle(title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSubmit();
    } else if (e.key === "Escape") {
      setEditedTitle(title);
      setIsEditingTitle(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-shrink-0 px-6 py-4 border-b border-surface-200 dark:border-surface-700">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-surface-200 dark:bg-surface-700 rounded"></div>
          <div className="h-7 w-64 bg-surface-200 dark:bg-surface-700 rounded"></div>
          <div className="h-5 w-48 bg-surface-200 dark:bg-surface-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 px-6 py-4 border-b border-surface-200 dark:border-surface-700 space-y-3">
      {/* Row 1: Back + Key + Title + Actions (compact) */}
      <div className="flex items-center gap-3">
        {/* Back button */}
        <Link
          to={backTo}
          className="flex items-center gap-1 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors flex-shrink-0"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          {backLabel}
        </Link>

        {/* Separator */}
        <div className="h-6 w-px bg-surface-200 dark:bg-surface-700 flex-shrink-0" />

        {/* Entity key */}
        <span className="text-sm font-mono text-surface-500 dark:text-surface-400 flex-shrink-0">
          {entityKey}
        </span>

        {/* Title (editable) */}
        {isEditingTitle && onTitleChange ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 min-w-0 text-xl font-semibold bg-transparent border-b-2 border-accent-500 outline-none text-surface-900 dark:text-white"
          />
        ) : (
          <h1
            className={`text-xl font-semibold text-surface-900 dark:text-white truncate flex-1 min-w-0 ${
              onTitleChange
                ? "cursor-pointer hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                : ""
            }`}
            onClick={() => onTitleChange && setIsEditingTitle(true)}
            title={onTitleChange ? "Click to edit" : undefined}
          >
            {title}
          </h1>
        )}

        {/* Primary action slot */}
        {primaryAction && (
          <div className="flex-shrink-0">{primaryAction}</div>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="btn btn-danger flex-shrink-0"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>

      {/* Row 3: Status + Badges + Metadata + Actions */}
      <div className="flex items-center gap-3 text-sm">
        {/* Status dropdown */}
        <StatusBadge
          status={status}
          variant={onStatusChange ? "dropdown" : "default"}
          onChange={onStatusChange}
          options={statusOptions}
        />

        {/* Context badges */}
        {badges &&
          badges.map((badge, index) => (
            <span key={index} className="flex items-center gap-1">
              <span className="text-surface-400 dark:text-surface-600">·</span>
              {badge.href ? (
                <Link
                  to={badge.href}
                  className="text-surface-600 dark:text-surface-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                >
                  {badge.label}: {badge.value}
                </Link>
              ) : (
                <span className="text-surface-600 dark:text-surface-400">
                  {badge.label}: {badge.value}
                </span>
              )}
            </span>
          ))}

        {/* Metadata */}
        {createdAt && (
          <>
            <span className="text-surface-400 dark:text-surface-600">·</span>
            <span className="text-surface-500 dark:text-surface-500">
              Created {formatDate(createdAt)}
            </span>
          </>
        )}
        {updatedAt && (
          <>
            <span className="text-surface-400 dark:text-surface-600">·</span>
            <span className="text-surface-500 dark:text-surface-500">
              Updated {formatRelativeTime(updatedAt)}
            </span>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions menu */}
        {actions && actions.length > 0 && (
          <div className="relative" ref={actionsMenuRef}>
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-1.5 rounded-md text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-800 transition-colors"
              title="More actions"
            >
              <MoreVerticalIcon className="w-5 h-5" />
            </button>

            {showActionsMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-surface-900 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-50">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick();
                      setShowActionsMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      action.variant === "danger"
                        ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        : "text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800"
                    }`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
