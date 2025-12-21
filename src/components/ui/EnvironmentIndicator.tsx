import { useState, useRef, useEffect } from "react";
import {
  getCurrentEnvironment,
  setEnvironmentOverride,
  hasEnvironmentOverride,
  clearEnvironmentOverride,
  isDevelopmentMode,
  type Environment,
} from "../../lib/environment";

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 12.75 6 6 9-13.5"
      />
    </svg>
  );
}

interface EnvironmentOption {
  value: Environment;
  label: string;
  description: string;
}

const environments: EnvironmentOption[] = [
  {
    value: "local",
    label: "Local",
    description: "localhost:8090 + Firebase Emulator",
  },
  {
    value: "staging",
    label: "Staging",
    description: "Cloud Run + Production Firebase",
  },
];

/**
 * Environment indicator shown in the TopBar.
 * Only visible in development mode.
 * Allows switching between local and staging backends.
 */
export function EnvironmentIndicator() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDevMode = isDevelopmentMode();
  const currentEnv = getCurrentEnvironment();
  const hasOverride = hasEnvironmentOverride();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Only show in development mode
  if (!isDevMode) {
    return null;
  }

  const handleSelect = (env: Environment) => {
    if (env === currentEnv && !hasOverride) {
      // Already on this environment with no override, nothing to do
      setIsOpen(false);
      return;
    }

    // If selecting the default environment and there's an override, clear it
    // Otherwise set the new override
    const defaultEnv =
      import.meta.env.MODE === "staging" ? "staging" : "local";
    if (env === defaultEnv && hasOverride) {
      clearEnvironmentOverride();
    } else {
      setEnvironmentOverride(env);
    }
    // Note: page will reload, so no need to close dropdown
  };

  const envColor =
    currentEnv === "staging"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded border ${envColor} hover:opacity-80 transition-opacity`}
        title={`Current environment: ${currentEnv}${hasOverride ? " (override)" : ""}`}
      >
        <ServerIcon className="w-3.5 h-3.5" />
        <span className="uppercase">{currentEnv}</span>
        {hasOverride && <span className="text-[10px] opacity-70">*</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 py-1 z-50">
          <div className="px-3 py-2 border-b border-surface-200 dark:border-surface-700">
            <div className="text-xs font-medium text-surface-500 dark:text-surface-400">
              Switch Backend
            </div>
          </div>
          {environments.map((env) => (
            <button
              key={env.value}
              onClick={() => handleSelect(env.value)}
              className="w-full px-3 py-2 flex items-start gap-3 hover:bg-surface-100 dark:hover:bg-surface-700 text-left"
            >
              <div className="w-4 h-4 mt-0.5 flex-shrink-0">
                {currentEnv === env.value && (
                  <CheckIcon className="w-4 h-4 text-accent-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {env.label}
                </div>
                <div className="text-xs text-surface-500 dark:text-surface-400">
                  {env.description}
                </div>
              </div>
            </button>
          ))}
          {hasOverride && (
            <>
              <div className="border-t border-surface-200 dark:border-surface-700 my-1" />
              <button
                onClick={() => clearEnvironmentOverride()}
                className="w-full px-3 py-2 text-xs text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 text-left"
              >
                Clear override (use default from Vite mode)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
