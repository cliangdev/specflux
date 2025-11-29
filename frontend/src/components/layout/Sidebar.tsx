import { useState, useEffect, useCallback, useRef } from "react";
import { NavLink } from "react-router-dom";

const SIDEBAR_STORAGE_KEY = "specflux-sidebar";
const MIN_SIDEBAR_WIDTH = 200;
const DEFAULT_SIDEBAR_WIDTH = 256;

interface SidebarState {
  width: number;
  collapsed: boolean;
}

function getInitialState(): SidebarState {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          width: parsed.width ?? DEFAULT_SIDEBAR_WIDTH,
          collapsed: parsed.collapsed ?? false,
        };
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }
  return { width: DEFAULT_SIDEBAR_WIDTH, collapsed: false };
}

const navItems = [
  {
    to: "/board",
    label: "Board",
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
        />
      </svg>
    ),
  },
  {
    to: "/tasks",
    label: "Tasks",
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    to: "/epics",
    label: "Epics",
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    to: "/roadmap",
    label: "Roadmap",
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    ),
  },
  {
    to: "/files",
    label: "Files",
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

// Hamburger menu icon
function HamburgerIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

// Chevron left icon for collapse button
function ChevronLeftIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

export default function Sidebar() {
  const [state, setState] = useState<SidebarState>(getInitialState);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggleCollapsed = useCallback(() => {
    setState((prev) => ({ ...prev, collapsed: !prev.collapsed }));
  }, []);

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate max width as half of the screen
      const maxWidth = Math.floor(window.innerWidth / 2);
      const newWidth = Math.max(
        MIN_SIDEBAR_WIDTH,
        Math.min(maxWidth, e.clientX)
      );
      setState((prev) => ({ ...prev, width: newWidth }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Collapsed state: show hamburger icon only
  if (state.collapsed) {
    return (
      <aside className="w-14 bg-system-50 dark:bg-system-900 border-r border-system-200 dark:border-system-800 flex flex-col">
        <div className="px-3 py-4">
          <button
            onClick={toggleCollapsed}
            className="p-2 rounded-lg text-system-600 dark:text-system-400 hover:text-system-900 dark:hover:text-white hover:bg-system-100 dark:hover:bg-system-800 transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <HamburgerIcon />
          </button>
        </div>
        <nav className="flex-1 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-center p-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-brand-600 text-white"
                        : "text-system-600 dark:text-system-400 hover:text-system-900 dark:hover:text-white hover:bg-system-100 dark:hover:bg-system-800"
                    }`
                  }
                  title={item.label}
                >
                  {item.icon}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    );
  }

  // Expanded state: full sidebar with resize handle
  return (
    <aside
      ref={sidebarRef}
      className="bg-system-50 dark:bg-system-900 border-r border-system-200 dark:border-system-800 flex flex-col relative"
      style={{ width: state.width }}
    >
      <nav className="flex-1 px-3 py-4 overflow-hidden">
        <div className="mb-2 px-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-system-400 dark:text-system-500">
            Navigation
          </span>
          <button
            onClick={toggleCollapsed}
            className="p-1 rounded text-system-400 dark:text-system-500 hover:text-system-600 dark:hover:text-system-300 hover:bg-system-100 dark:hover:bg-system-800 transition-colors"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeftIcon />
          </button>
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "text-system-600 dark:text-system-400 hover:text-system-900 dark:hover:text-white hover:bg-system-100 dark:hover:bg-system-800"
                  }`
                }
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {/* Resize handle - wider hit area for easier grabbing */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 -right-1 w-3 h-full cursor-col-resize group flex items-center justify-center"
        aria-label="Resize sidebar"
      >
        {/* Visual indicator - thin line that highlights on hover/drag */}
        <div
          className={`w-0.5 h-full transition-colors ${
            isResizing
              ? "bg-brand-500"
              : "bg-system-300 dark:bg-system-700 group-hover:bg-brand-500"
          }`}
        />
      </div>
    </aside>
  );
}
