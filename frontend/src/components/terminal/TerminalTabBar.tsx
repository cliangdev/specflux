import type {
  TerminalSession,
  ContextType,
} from "../../contexts/TerminalContext";

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

// Context type icons
const TaskIcon = () => (
  <svg
    className="w-3 h-3 flex-shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

const EpicIcon = () => (
  <svg
    className="w-3 h-3 flex-shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
    />
  </svg>
);

const ProjectIcon = () => (
  <svg
    className="w-3 h-3 flex-shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

function ContextIcon({ type }: { type: ContextType }) {
  switch (type) {
    case "task":
      return <TaskIcon />;
    case "epic":
      return <EpicIcon />;
    case "project":
      return <ProjectIcon />;
  }
}

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
        const contextType = session.contextType ?? "task";
        const contextId = session.contextId ?? session.taskId;
        const contextTitle = session.contextTitle ?? session.taskTitle;
        const truncatedTitle =
          contextTitle.length > 20
            ? contextTitle.substring(0, 20) + "..."
            : contextTitle;

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
            data-testid={`terminal-tab-${contextId}`}
            title={`${contextTitle} (⌘${index + 1})`}
          >
            {/* Context type icon */}
            <ContextIcon type={contextType} />

            {/* Status indicator */}
            {!session.isConnected && (
              <span
                className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"
                title="Disconnected"
                data-testid={`terminal-tab-disconnected-${contextId}`}
              />
            )}
            {session.isRunning && (
              <span
                className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"
                title="Running"
                data-testid={`terminal-tab-running-${contextId}`}
              />
            )}
            {session.isConnected && !session.isRunning && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0"
                title="Connected"
                data-testid={`terminal-tab-connected-${contextId}`}
              />
            )}

            {/* Agent indicator */}
            {session.agent && (
              <span
                className="flex-shrink-0"
                title={`Agent: ${session.agent.name}`}
              >
                {session.agent.emoji}
              </span>
            )}

            {/* Tab label */}
            <span className="truncate">
              #{contextId}: {truncatedTitle}
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
              data-testid={`terminal-tab-close-${contextId}`}
            >
              <XIcon />
            </button>
          </div>
        );
      })}
    </div>
  );
}
