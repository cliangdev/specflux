import { useState } from "react";
import { ProjectSelector, EnvironmentIndicator } from "../ui";
import { useTheme, useAuth } from "../../contexts";
import { UserProfileModal } from "../ui/UserProfileModal";

function SunIcon({ className }: { className?: string }) {
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
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
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
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
      />
    </svg>
  );
}

export default function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Get user initial for avatar
  const userInitial = user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <>
      <header className="h-14 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SF</span>
            </div>
            <span className="text-lg font-semibold text-surface-900 dark:text-white">
              SpecFlux
            </span>
            {import.meta.env.VITE_APP_VARIANT === "preview" && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                PREVIEW
              </span>
            )}
          </div>
          <div className="h-6 w-px bg-surface-200 dark:bg-surface-700" />
          <ProjectSelector />
        </div>

        <div className="flex items-center gap-3">
          <EnvironmentIndicator />
          <div className="h-6 w-px bg-surface-200 dark:bg-surface-700" />
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setShowProfileModal(true)}
            className="w-8 h-8 rounded-full bg-accent-600 flex items-center justify-center text-sm font-medium text-white hover:bg-accent-700 transition-colors"
          >
            {userInitial}
          </button>
        </div>
      </header>

      {showProfileModal && (
        <UserProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </>
  );
}
