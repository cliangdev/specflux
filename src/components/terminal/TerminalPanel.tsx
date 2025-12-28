import { useCallback, useState, useRef, useEffect, memo } from "react";
import { useTerminal, type TerminalSession, type PanelPosition } from "../../contexts/TerminalContext";
import { useProject } from "../../contexts";
import Terminal, { type TerminalRef } from "../Terminal";
import TerminalTabBar from "./TerminalTabBar";
import DuplicateSessionDialog from "./DuplicateSessionDialog";
import { TerminalErrorBoundary } from "./TerminalErrorBoundary";

// Memoized Terminal component to prevent unnecessary re-renders during high output
const MemoizedTerminal = memo(Terminal, (prev, next) => {
  // Only re-render if critical props change (not callbacks which are stable via useCallback)
  return (
    prev.contextId === next.contextId &&
    prev.contextType === next.contextType &&
    prev.contextDisplayKey === next.contextDisplayKey &&
    prev.contextTitle === next.contextTitle &&
    prev.projectRef === next.projectRef &&
    prev.workingDirectory === next.workingDirectory &&
    prev.initialCommand === next.initialCommand &&
    prev.initialPrompt === next.initialPrompt
  );
});

// Position indicator icons
const PositionIcon = ({ position }: { position: PanelPosition }) => {
  switch (position) {
    case "bottom":
      return (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="14" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="2" y="10" width="12" height="4" rx="0.5" fill="currentColor" />
        </svg>
      );
    case "left":
      return (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="14" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="2" y="2" width="4" height="12" rx="0.5" fill="currentColor" />
        </svg>
      );
    case "right":
      return (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="1" width="14" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="10" y="2" width="4" height="12" rx="0.5" fill="currentColor" />
        </svg>
      );
  }
};

// Icon components
const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

const MinusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
  </svg>
);

const XMarkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const MaximizeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const RestoreIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
  </svg>
);

const ScrollDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// Map page types to session context types (outside component for stable reference)
const PAGE_TYPE_TO_CONTEXT_TYPE: Record<string, "task" | "epic" | "prd-workshop" | "release"> = {
  "prd-detail": "prd-workshop",
  "task-detail": "task",
  "epic-detail": "epic",
  "release-detail": "release",
};

export default function TerminalPanel() {
  const { currentProject, getProjectRef } = useProject();
  const {
    isCollapsed,
    panelHeight,
    panelWidth,
    panelPosition,
    isMaximized,
    sessions: allSessions,
    activeSessionId,
    closePanel,
    toggleCollapse,
    setPanelHeight,
    setPanelWidth,
    setPanelPosition,
    toggleMaximize,
    switchToSession,
    closeSession,
    updateSessionStatus,
    openTerminalForContext,
    pageContext,
  } = useTerminal();

  // Filter sessions to only show those belonging to the current project
  const sessions = allSessions.filter((session) => {
    // If no project is selected, show no sessions
    if (!currentProject) return false;
    // If session has no projectRef, check if contextId matches project ID (for project-level sessions)
    if (!session.projectRef) {
      return session.contextType === "project" && session.contextId === currentProject.id;
    }
    // Match by projectRef (handles both project key and project ID)
    return session.projectRef === currentProject.id || session.projectRef === currentProject.projectKey;
  });

  // Auto-switch to a valid session if current active session is not in filtered list
  useEffect(() => {
    if (activeSessionId && sessions.length > 0) {
      const isActiveInFiltered = sessions.some((s) => s.id === activeSessionId);
      if (!isActiveInFiltered) {
        // Switch to the first session in the filtered list
        switchToSession(sessions[0].id);
      }
    }
  }, [activeSessionId, sessions, switchToSession]);

  const [duplicateSession, setDuplicateSession] = useState<TerminalSession | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [showPositionMenu, setShowPositionMenu] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);
  const terminalRefs = useRef<Map<string, TerminalRef>>(new Map());

  // Helper to find existing session for current page context
  const findExistingSessionForPageContext = useCallback((): TerminalSession | null => {
    if (!pageContext || !pageContext.id) return null;
    const contextType = PAGE_TYPE_TO_CONTEXT_TYPE[pageContext.type];
    if (!contextType) return null;
    const expectedSessionId = `${contextType}-${pageContext.id}`;
    return sessions.find((s) => s.id === expectedSessionId) || null;
  }, [pageContext, sessions]);

  // Handler for starting a new session
  const handleStartNewSession = useCallback(() => {
    if (!pageContext || !pageContext.id) return;
    const contextType = PAGE_TYPE_TO_CONTEXT_TYPE[pageContext.type];
    if (!contextType) return;

    const existing = findExistingSessionForPageContext();
    if (existing) {
      setDuplicateSession(existing);
      return;
    }

    const displayKey = pageContext.title || String(pageContext.id);
    const projRef = getProjectRef() ?? undefined;

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

  // Create status/connection handlers
  const createStatusChangeHandler = useCallback(
    (sessionId: string) => (running: boolean) => {
      updateSessionStatus(sessionId, { isRunning: running });
    },
    [updateSessionStatus],
  );

  const createConnectionChangeHandler = useCallback(
    (sessionId: string) => (connected: boolean) => {
      updateSessionStatus(sessionId, { isConnected: connected });
    },
    [updateSessionStatus],
  );

  // Terminal control handlers
  const handleScrollToBottom = useCallback(() => {
    if (activeSessionId) {
      terminalRefs.current.get(activeSessionId)?.scrollToBottom();
    }
  }, [activeSessionId]);

  const handleClearBuffer = useCallback(() => {
    if (activeSessionId) {
      terminalRefs.current.get(activeSessionId)?.clearBuffer();
    }
  }, [activeSessionId]);

  const handleSearch = useCallback(() => {
    if (activeSessionId) {
      terminalRefs.current.get(activeSessionId)?.openSearch();
    }
  }, [activeSessionId]);

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      if (panelPosition === "bottom") {
        startPosRef.current = e.clientY;
        startSizeRef.current = panelHeight;
      } else {
        startPosRef.current = e.clientX;
        startSizeRef.current = panelWidth;
      }
      document.body.style.cursor = panelPosition === "bottom" ? "ns-resize" : "ew-resize";
      document.body.style.userSelect = "none";
    },
    [panelHeight, panelWidth, panelPosition],
  );

  useEffect(() => {
    if (!isResizing) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (panelPosition === "bottom") {
          const deltaY = startPosRef.current - e.clientY;
          setPanelHeight(startSizeRef.current + deltaY);
        } else if (panelPosition === "left") {
          const deltaX = e.clientX - startPosRef.current;
          setPanelWidth(startSizeRef.current + deltaX);
        } else {
          const deltaX = startPosRef.current - e.clientX;
          setPanelWidth(startSizeRef.current + deltaX);
        }
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
  }, [isResizing, panelPosition, setPanelHeight, setPanelWidth]);

  // Close position menu on outside click
  useEffect(() => {
    if (!showPositionMenu) return;
    const handleClick = () => setShowPositionMenu(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showPositionMenu]);

  // Panel fills its container (parent handles fixed positioning and dimensions)
  const getPanelStyles = () => {
    return {
      width: "100%",
      height: "100%",
    };
  };

  // Resize handle position
  const getResizeHandleStyles = () => {
    switch (panelPosition) {
      case "bottom":
        return "absolute -top-1 left-0 right-0 h-3 cursor-ns-resize";
      case "left":
        return "absolute top-0 -right-1 bottom-0 w-3 cursor-ew-resize";
      case "right":
        return "absolute top-0 -left-1 bottom-0 w-3 cursor-ew-resize";
    }
  };

  const getResizeIndicatorStyles = () => {
    if (panelPosition === "bottom") {
      return "w-12 h-1";
    }
    return "w-1 h-12";
  };

  // Border styles based on position
  const getBorderStyles = () => {
    switch (panelPosition) {
      case "bottom":
        return "border-t";
      case "left":
        return "border-r";
      case "right":
        return "border-l";
    }
  };

  return (
    <div
      ref={panelRef}
      className={`relative ${getBorderStyles()} border-slate-200 dark:border-slate-700 bg-slate-900 flex flex-col flex-shrink-0 ${
        isResizing ? "" : "transition-[width,height] duration-100 ease-out"
      }`}
      style={getPanelStyles()}
      data-testid="terminal-panel"
    >
      {!isCollapsed && (
        <div
          className={`${getResizeHandleStyles()} z-20 flex items-center justify-center group`}
          onMouseDown={handleResizeStart}
          onDoubleClick={toggleMaximize}
          data-testid="terminal-resize-handle"
        >
          <div
            className={`${getResizeIndicatorStyles()} rounded-full transition-colors ${
              isResizing ? "bg-accent-500" : "bg-slate-600 group-hover:bg-accent-500/70"
            }`}
          />
        </div>
      )}

      <div className="bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="h-10 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <span className="text-sm font-medium text-slate-300 flex-shrink-0 pl-2">🤖</span>

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

          <div className="flex items-center gap-0.5 flex-shrink-0 pr-2">
            {!isCollapsed && activeSessionId && (
              <>
                <button
                  onClick={handleScrollToBottom}
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Scroll to bottom"
                >
                  <ScrollDownIcon />
                </button>
                <button
                  onClick={handleClearBuffer}
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Clear buffer"
                >
                  <TrashIcon />
                </button>
                <button
                  onClick={handleSearch}
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Search (⌘F)"
                >
                  <SearchIcon />
                </button>
                <span className="w-px h-4 bg-slate-700 mx-1" />
              </>
            )}

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPositionMenu(!showPositionMenu);
                }}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Panel position"
              >
                <PositionIcon position={panelPosition} />
              </button>

              {showPositionMenu && (
                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                  {(["bottom", "left", "right"] as PanelPosition[]).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => {
                        setPanelPosition(pos);
                        setShowPositionMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-slate-700 ${
                        panelPosition === pos ? "text-accent-400" : "text-slate-300"
                      }`}
                    >
                      <PositionIcon position={pos} />
                      <span className="capitalize">{pos}</span>
                      {panelPosition === pos && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
              data-testid="claude-panel-collapse-btn"
            >
              {isCollapsed ? <ChevronUpIcon /> : <MinusIcon />}
            </button>

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
      </div>

      <div
        className={`flex-1 overflow-hidden relative ${isCollapsed ? "invisible h-0" : ""}`}
        aria-hidden={isCollapsed}
      >
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`absolute inset-0 ${
                session.id === activeSessionId ? "visible" : "invisible"
              }`}
              data-testid={`terminal-content-${session.contextId}`}
            >
              <TerminalErrorBoundary
                sessionId={session.id}
                onReset={() => {
                  // Force re-render by removing and re-adding the ref
                  terminalRefs.current.delete(session.id);
                }}
              >
                <MemoizedTerminal
                  ref={(ref) => {
                    if (ref) {
                      terminalRefs.current.set(session.id, ref);
                    } else {
                      terminalRefs.current.delete(session.id);
                    }
                  }}
                  contextType={session.contextType}
                  contextId={session.contextId}
                  contextDisplayKey={session.displayKey}
                  contextTitle={session.contextTitle}
                  projectRef={session.projectRef}
                  workingDirectory={session.workingDirectory}
                  initialCommand={session.initialCommand}
                  initialPrompt={session.initialPrompt}
                  forceNew={session.forceNew}
                  onStatusChange={createStatusChangeHandler(session.id)}
                  onConnectionChange={createConnectionChangeHandler(session.id)}
                />
              </TerminalErrorBoundary>
            </div>
          ))
        ) : (
          !isCollapsed && (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center">
                <p className="text-sm">No active session</p>
                <p className="text-xs mt-1">
                  Open a task and click "Launch Agent" to start
                </p>
              </div>
            </div>
          )
        )}
      </div>

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
