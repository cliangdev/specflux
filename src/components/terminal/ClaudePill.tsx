import { useTerminal } from "../../contexts/TerminalContext";
import { useProject } from "../../contexts";

/**
 * Floating pill that appears when the Claude panel is closed.
 * Shows context about active sessions and provides quick access to reopen.
 */
export default function ClaudePill() {
  const { isOpen, sessions: allSessions, activeSessionId, openPanel } = useTerminal();
  const { currentProject } = useProject();

  // Only show when panel is closed
  if (isOpen) {
    return null;
  }

  // Filter sessions to only show those belonging to the current project
  const sessions = allSessions.filter((session) => {
    if (!currentProject) return false;
    if (!session.projectRef) {
      return session.contextType === "project" && session.contextId === currentProject.id;
    }
    return session.projectRef === currentProject.id || session.projectRef === currentProject.projectKey;
  });

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const hasRunningSessions = sessions.some((s) => s.isRunning);
  const sessionCount = sessions.length;

  // Determine what to show in the pill
  let label: string;
  if (sessionCount === 0) {
    label = "⌘T";
  } else if (sessionCount === 1 && activeSession) {
    label = activeSession.displayKey || activeSession.contextTitle;
  } else if (sessionCount > 1) {
    label = `${sessionCount} chats`;
  } else {
    label = "⌘T";
  }

  return (
    <button
      onClick={openPanel}
      className={`
        fixed bottom-4 right-4 z-40
        flex items-center gap-2 px-3 py-2
        bg-slate-800 border border-slate-700 rounded-full
        text-slate-200 text-sm font-medium
        shadow-lg hover:bg-slate-700 hover:border-slate-600
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-slate-900
      `}
      title="Open Claude panel (⌘T)"
      data-testid="claude-pill"
    >
      <span>🤖</span>
      {hasRunningSessions && (
        <span
          className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
          title="Session running"
          data-testid="claude-pill-running"
        />
      )}
      <span className="max-w-[120px] truncate">{label}</span>
    </button>
  );
}
