import { useCallback, useState, useRef, useEffect } from "react";
import { useTerminal, type TerminalSession } from "../../contexts/TerminalContext";
import { useProject } from "../../contexts";
import Terminal from "../Terminal";
import TerminalTabBar from "./TerminalTabBar";
import DuplicateSessionDialog from "./DuplicateSessionDialog";

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
  const { currentProject, getProjectRef } = useProject();
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
    pageContext,
    suggestedCommands,
  } = useTerminal();

  const [duplicateSession, setDuplicateSession] = useState<TerminalSession | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Map page types to session context types
  const pageTypeToContextType: Record<string, "task" | "epic" | "prd-workshop" | "release"> = {
    "prd-detail": "prd-workshop",
    "task-detail": "task",
    "epic-detail": "epic",
    "release-detail": "release",
  };

  // Helper to find existing session for current page context
  const findExistingSessionForPageContext = useCallback((): TerminalSession | null => {
    if (!pageContext || !pageContext.id) return null;

    const contextType = pageTypeToContextType[pageContext.type];
    if (!contextType) return null;

    // Match the session ID format used in openTerminalForContext
    const expectedSessionId = `${contextType}-${pageContext.id}`;
    return sessions.find((s) => s.id === expectedSessionId) || null;
  }, [pageContext, sessions]);

  // Handler for starting a new session from current page context
  const handleStartNewSession = useCallback(() => {
    if (!pageContext || !pageContext.id) return;

    const contextType = pageTypeToContextType[pageContext.type];
    if (!contextType) return;

    // Check for existing session
    const existing = findExistingSessionForPageContext();
    if (existing) {
      setDuplicateSession(existing);
      return;
    }

    // Use title as displayKey (pages set title to displayKey || title)
    // Fall back to id if title is not available
    const displayKey = pageContext.title || String(pageContext.id);
    const projRef = getProjectRef() ?? undefined;

    // Create session from page context - always start claude
    openTerminalForContext({
      type: contextType,
      id: pageContext.id,
      title: displayKey,
      displayKey: displayKey,
      projectRef: projRef,
      workingDirectory: currentProject?.localPath,
      initialCommand: "claude",
    });
  }, [pageContext, findExistingSessionForPageContext, openTerminalForContext, currentProject?.localPath, getProjectRef]);

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

      {/* Header - Two lines: Line 1 = branding + tabs + controls, Line 2 = suggestions */}
      <div className="bg-slate-800 border-b border-slate-700 flex-shrink-0">
        {/* Line 1: Main header */}
        <div className="h-10 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <span className="text-sm font-medium text-slate-300 flex-shrink-0 pl-2 flex items-center gap-1.5">
              <span>🤖</span>
              <span>Claude</span>
            </span>
            {/* New Session Button - only show when on a detail page with valid context */}
            {currentProject && pageContext?.id && (
              <button
                onClick={handleStartNewSession}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
                title={`New session for ${pageContext.title || pageContext.type}`}
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
                  pageContext={pageContext}
                  onStartNewSession={handleStartNewSession}
                />
              </>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 pr-2">
            {/* Help button */}
            <button
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Keyboard shortcuts:&#10;⌘T - Toggle panel&#10;⌘1-9 - Switch tabs&#10;⌘W - Close tab"
              data-testid="claude-panel-help-btn"
            >
              <span className="text-xs font-medium">?</span>
            </button>

            {/* Maximize/Restore button - only show when expanded */}
            {!isCollapsed && (
              <button
                onClick={toggleMaximize}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title={isMaximized ? "Restore" : "Maximize"}
                data-testid="claude-panel-maximize-btn"
              >
                {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
              </button>
            )}

            {/* Collapse/Expand button */}
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
              data-testid="claude-panel-collapse-btn"
            >
              {isCollapsed ? <ChevronUpIcon /> : <MinusIcon />}
            </button>

            {/* Close button */}
            <button
              onClick={closePanel}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Close panel (⌘T)"
              data-testid="claude-panel-close-btn"
            >
              <XMarkIcon />
            </button>
          </div>
        </div>

        {/* Line 2: Suggested commands (only show when expanded and has suggestions) */}
        {!isCollapsed && suggestedCommands.length > 0 && (
          <div className="h-7 flex items-center justify-end px-3 border-t border-slate-700/50 text-xs">
            <span className="text-slate-600">
              try:{" "}
              {suggestedCommands.map((cmd, i) => (
                <span key={cmd.command}>
                  {i > 0 && <span className="mx-1">·</span>}
                  <button
                    onClick={() => navigator.clipboard.writeText(cmd.command)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    title={cmd.description || `Copy: ${cmd.command}`}
                  >
                    {cmd.label}
                  </button>
                </span>
              ))}
            </span>
          </div>
        )}
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
                  contextDisplayKey={session.displayKey}
                  projectRef={session.projectRef}
                  workingDirectory={session.workingDirectory}
                  initialCommand={session.initialCommand}
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

      {/* Duplicate Session Warning Dialog */}
      {duplicateSession && (
        <DuplicateSessionDialog
          existingSession={duplicateSession}
          onOpenExisting={() => {
            switchToSession(duplicateSession.id);
            setDuplicateSession(null);
          }}
          onCancel={() => setDuplicateSession(null)}
        />
      )}
    </div>
  );
}
