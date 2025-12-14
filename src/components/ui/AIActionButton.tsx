import { useState, useRef, useEffect } from "react";

// Inline SVG icons
const RobotIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    {/* Robot head */}
    <rect x="4" y="8" width="16" height="12" rx="2" />
    {/* Antenna */}
    <path strokeLinecap="round" d="M12 8V5" />
    <circle cx="12" cy="4" r="1" fill="currentColor" />
    {/* Eyes */}
    <circle cx="9" cy="13" r="1.5" fill="currentColor" />
    <circle cx="15" cy="13" r="1.5" fill="currentColor" />
    {/* Mouth */}
    <path strokeLinecap="round" d="M9 17h6" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export type EntityType = "prd" | "epic" | "task" | "release";

export interface AIActionButtonProps {
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  hasExistingSession?: boolean;
  isTerminalActive?: boolean;
  onStartWork: () => void;
  onContinueWork?: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function AIActionButton({
  entityType,
  entityId,
  entityTitle,
  hasExistingSession = false,
  isTerminalActive = false,
  onStartWork,
  onContinueWork,
  disabled = false,
  size = "md",
  className = "",
}: AIActionButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const handlePrimaryClick = () => {
    if (hasExistingSession && onContinueWork) {
      onContinueWork();
    } else {
      onStartWork();
    }
  };

  const sizeClasses =
    size === "sm" ? "px-3 py-1.5 text-sm gap-1.5" : "px-4 py-2 text-sm gap-2";

  const buttonLabel = hasExistingSession ? "Resume Agent" : "Launch Agent";

  return (
    <div className={`relative inline-flex ${className}`} ref={dropdownRef}>
      {/* Main button */}
      <button
        onClick={handlePrimaryClick}
        disabled={disabled}
        className={`inline-flex items-center font-medium rounded-lg transition-colors ${sizeClasses} ${
          disabled
            ? "bg-surface-300 dark:bg-surface-700 text-surface-500 dark:text-surface-400 cursor-not-allowed"
            : "bg-accent-600 hover:bg-accent-700 text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:focus:ring-offset-surface-900"
        } ${onContinueWork ? "rounded-r-none border-r border-accent-700" : ""}`}
        title={`${buttonLabel} on ${entityTitle}`}
      >
        {/* Active indicator */}
        {isTerminalActive && (
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
        )}

        <RobotIcon className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
        <span>{buttonLabel}</span>
      </button>

      {/* Dropdown toggle (only if we have additional actions) */}
      {onContinueWork && (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={disabled}
          className={`inline-flex items-center justify-center px-2 rounded-r-lg transition-colors ${
            disabled
              ? "bg-surface-300 dark:bg-surface-700 text-surface-500 dark:text-surface-400 cursor-not-allowed"
              : "bg-accent-600 hover:bg-accent-700 text-white"
          }`}
          aria-label="More options"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      )}

      {/* Dropdown menu */}
      {showDropdown && onContinueWork && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-surface-900 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-50">
          <button
            onClick={() => {
              onStartWork();
              setShowDropdown(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            <RobotIcon className="w-4 h-4" />
            Launch New Agent
          </button>
          <button
            onClick={() => {
              onContinueWork();
              setShowDropdown(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Resume Existing Agent
          </button>
        </div>
      )}
    </div>
  );
}
