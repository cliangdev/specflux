import { useCallback, useState } from "react";
import { useTerminal } from "../../contexts/TerminalContext";
import { useProject } from "../../contexts";
import Terminal from "../Terminal";
import TerminalTabBar from "./TerminalTabBar";
import NewSessionDialog from "./NewSessionDialog";

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

const PlusIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

export default function TerminalPanel() {
  const { currentProject } = useProject();
  const {
    isCollapsed,
    sessions,
    activeSessionId,
    closePanel,
    toggleCollapse,
    switchToSession,
    closeSession,
    updateSessionStatus,
    openTerminalForContext,
  } = useTerminal();

  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);

  // Create status change handler for a specific session
  const createStatusChangeHandler = useCallback(
    (sessionId: string) => (running: boolean) => {
      updateSessionStatus(sessionId, { isRunning: running });
    },
    [updateSessionStatus],
  );

  return (
    <div
      className={`border-t border-slate-200 dark:border-slate-700 bg-slate-900 flex flex-col ${
        isCollapsed ? "h-10" : "h-80"
      } transition-all duration-200`}
      data-testid="terminal-panel"
    >
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-1 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <span className="text-sm font-medium text-slate-300 flex-shrink-0 pl-2">
            Terminal
          </span>
          {/* New Session Button */}
          {currentProject && (
            <button
              onClick={() => setShowNewSessionDialog(true)}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
              title="New session"
              data-testid="new-session-btn"
            >
              <PlusIcon />
            </button>
          )}
          {sessions.length > 0 && (
            <>
              <span className="text-slate-600 flex-shrink-0">|</span>
              <TerminalTabBar
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSwitchSession={switchToSession}
                onCloseSession={closeSession}
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 pr-2">
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
            title="Close terminal (⌘T)"
            data-testid="terminal-close-btn"
          >
            <XMarkIcon />
          </button>
        </div>
      </div>

      {/* Terminal content - render all sessions, show/hide based on active */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden relative">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`absolute inset-0 ${
                  session.id === activeSessionId ? "visible" : "invisible"
                }`}
                data-testid={`terminal-content-${session.contextId}`}
              >
                <Terminal
                  contextType={session.contextType}
                  contextId={session.contextId}
                  onStatusChange={createStatusChangeHandler(session.id)}
                />
              </div>
            ))
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

      {/* New Session Dialog */}
      {showNewSessionDialog && currentProject && (
        <NewSessionDialog
          projectId={currentProject.id}
          onClose={() => setShowNewSessionDialog(false)}
          onCreated={(context) => {
            openTerminalForContext(context);
            setShowNewSessionDialog(false);
          }}
        />
      )}
    </div>
  );
}
