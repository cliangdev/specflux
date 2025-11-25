import type { TerminalSession } from "../../contexts/TerminalContext";

interface TerminalTabBarProps {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onSwitchSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
}

// Close icon
const XIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export default function TerminalTabBar({
  sessions,
  activeSessionId,
  onSwitchSession,
  onCloseSession,
}: TerminalTabBarProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-thin"
      data-testid="terminal-tab-bar"
    >
      {sessions.map((session, index) => {
        const isActive = session.id === activeSessionId;
        const truncatedTitle =
          session.taskTitle.length > 20
            ? session.taskTitle.substring(0, 20) + "..."
            : session.taskTitle;

        return (
          <div
            key={session.id}
            className={`
              group flex items-center gap-2 px-3 py-1.5 rounded-t text-sm cursor-pointer
              transition-colors min-w-0 flex-shrink-0
              ${
                isActive
                  ? "bg-slate-900 text-slate-200 border-t border-x border-slate-700"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300"
              }
            `}
            onClick={() => onSwitchSession(session.id)}
            data-testid={`terminal-tab-${session.taskId}`}
            title={`${session.taskTitle} (⌘${index + 1})`}
          >
            {/* Running indicator */}
            {session.isRunning && (
              <span
                className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"
                data-testid={`terminal-tab-running-${session.taskId}`}
              />
            )}

            {/* Tab label */}
            <span className="truncate">
              #{session.taskId}: {truncatedTitle}
            </span>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseSession(session.id);
              }}
              className={`
                p-0.5 rounded opacity-0 group-hover:opacity-100
                hover:bg-slate-500 transition-opacity flex-shrink-0
                ${isActive ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-300"}
              `}
              title="Close tab"
              data-testid={`terminal-tab-close-${session.taskId}`}
            >
              <XIcon />
            </button>
          </div>
        );
      })}
    </div>
  );
}
