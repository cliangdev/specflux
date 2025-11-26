import { useCallback, useState, useRef, useEffect } from "react";
import { useTerminal } from "../../contexts/TerminalContext";
import { useProject } from "../../contexts";
import Terminal from "../Terminal";
import TerminalTabBar from "./TerminalTabBar";
import NewSessionDialog from "./NewSessionDialog";

const HEADER_HEIGHT = 40;
const COLLAPSED_HEIGHT = HEADER_HEIGHT;

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

const MaximizeIcon = () => (
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
      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
    />
  </svg>
);

const RestoreIcon = () => (
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
      d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
    />
  </svg>
);

export default function TerminalPanel() {
  const { currentProject } = useProject();
  const {
    isCollapsed,
    panelHeight,
    isMaximized,
    sessions,
    activeSessionId,
    closePanel,
    toggleCollapse,
    setPanelHeight,
    toggleMaximize,
    switchToSession,
    closeSession,
    updateSessionStatus,
    openTerminalForContext,
  } = useTerminal();

  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Create status change handler for a specific session
  const createStatusChangeHandler = useCallback(
    (sessionId: string) => (running: boolean) => {
      updateSessionStatus(sessionId, { isRunning: running });
    },
    [updateSessionStatus],
  );

  // Create connection change handler for a specific session
  const createConnectionChangeHandler = useCallback(
    (sessionId: string) => (connected: boolean) => {
      updateSessionStatus(sessionId, { isConnected: connected });
    },
    [updateSessionStatus],
  );

  // Resize handlers - use requestAnimationFrame for smoother resizing
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = panelHeight;
      // Add class to body to prevent text selection during resize
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    },
    [panelHeight],
  );

  useEffect(() => {
    if (!isResizing) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      // Cancel any pending animation frame
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        // Dragging up increases height (clientY decreases)
        const deltaY = startYRef.current - e.clientY;
        const newHeight = startHeightRef.current + deltaY;
        setPanelHeight(newHeight);
      });
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setPanelHeight]);

  // Calculate actual height - use flex-basis for better layout stability
  const actualHeight = isCollapsed ? COLLAPSED_HEIGHT : panelHeight;

  return (
    <div
      ref={panelRef}
      className={`relative border-t border-slate-200 dark:border-slate-700 bg-slate-900 flex flex-col flex-shrink-0 ${
        isResizing ? "" : "transition-[height] duration-150"
      }`}
      style={{
        height: `${actualHeight}px`,
        minHeight: `${COLLAPSED_HEIGHT}px`,
      }}
      data-testid="terminal-panel"
    >
      {/* Resize Handle - only show when expanded */}
      {!isCollapsed && (
        <div
          className={`absolute -top-1 left-0 right-0 h-3 cursor-ns-resize z-20 flex items-center justify-center group ${
            isResizing ? "" : ""
          }`}
          onMouseDown={handleResizeStart}
          onDoubleClick={toggleMaximize}
          data-testid="terminal-resize-handle"
        >
          {/* Visual indicator */}
          <div
            className={`w-12 h-1 rounded-full transition-colors ${
              isResizing
                ? "bg-brand-500"
                : "bg-slate-600 group-hover:bg-brand-500/70"
            }`}
          />
        </div>
      )}

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
          {/* Maximize/Restore button - only show when expanded */}
          {!isCollapsed && (
            <button
              onClick={toggleMaximize}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
              data-testid="terminal-maximize-btn"
            >
              {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
            </button>
          )}

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
                  onConnectionChange={createConnectionChangeHandler(session.id)}
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
