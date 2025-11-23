import { NotificationBell, ProjectSelector } from "../ui";
import { useTheme } from "../../contexts";

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

  return (
    <header className="h-14 bg-white dark:bg-system-900 border-b border-system-200 dark:border-system-800 px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SF</span>
          </div>
          <span className="text-lg font-semibold text-system-900 dark:text-white">
            SpecFlux
          </span>
        </div>
        <div className="h-6 w-px bg-system-200 dark:bg-system-700" />
        <ProjectSelector />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-system-500 hover:text-system-700 dark:text-system-400 dark:hover:text-system-200 hover:bg-system-100 dark:hover:bg-system-800 transition-colors"
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
        <NotificationBell count={0} />
        <button className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-medium text-white hover:bg-brand-700 transition-colors">
          U
        </button>
      </div>
    </header>
  );
}
