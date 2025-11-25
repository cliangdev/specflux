import { useTerminal } from "../../contexts/TerminalContext";
import Terminal from "../Terminal";

// Inline SVG icons to avoid heroicons dependency
const ChevronUpIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

const MinusIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
  </svg>
);

const XMarkIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export default function TerminalPanel() {
  const {
    isCollapsed,
    activeTask,
    isRunning,
    closePanel,
    toggleCollapse,
    setIsRunning,
  } = useTerminal();

  return (
    <div
      className={`border-t border-slate-200 dark:border-slate-700 bg-slate-900 flex flex-col ${
        isCollapsed ? "h-10" : "h-80"
      } transition-all duration-200`}
      data-testid="terminal-panel"
    >
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-300">Terminal</span>
          {activeTask && (
            <>
              <span className="text-slate-500">|</span>
              <span className="text-sm text-slate-400">
                #{activeTask.id}: {activeTask.title}
              </span>
            </>
          )}
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Running
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Collapse/Expand button */}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title={isCollapsed ? "Expand" : "Collapse"}
            data-testid="terminal-collapse-btn"
          >
            {isCollapsed ? <ChevronUpIcon /> : <MinusIcon />}
          </button>

          {/* Close button */}
          <button
            onClick={closePanel}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Close terminal (Cmd+`)"
            data-testid="terminal-close-btn"
          >
            <XMarkIcon />
          </button>
        </div>
      </div>

      {/* Terminal content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          {activeTask ? (
            <Terminal taskId={activeTask.id} onStatusChange={setIsRunning} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center">
                <p className="text-sm">No task selected</p>
                <p className="text-xs mt-1">
                  Open a task and click "Open in Terminal" to start
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
