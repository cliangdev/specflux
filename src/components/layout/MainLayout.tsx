import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import { ThemeProvider } from "../../contexts";
import { TerminalProvider, useTerminal } from "../../contexts/TerminalContext";
import TerminalPanel from "../terminal/TerminalPanel";
import ClaudePill from "../terminal/ClaudePill";

function MainLayoutContent() {
  const { isOpen, togglePanel, sessions, switchToSession, openPanel } =
    useTerminal();

  // Global keyboard shortcuts: Cmd+T to toggle terminal, Cmd+1-9 to switch tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+T to toggle terminal panel
      // Note: Cmd+` is reserved by macOS for window switching
      if ((e.metaKey || e.ctrlKey) && e.key === "t") {
        e.preventDefault();
        togglePanel();
        return;
      }

      // Cmd+1-9 to switch terminal tabs
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          const tabIndex = num - 1;
          if (sessions[tabIndex]) {
            e.preventDefault();
            openPanel();
            switchToSession(sessions[tabIndex].id);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePanel, sessions, switchToSession, openPanel]);

  // Layout: TopBar -> (Sidebar + Content) -> Terminal (full width at bottom)
  return (
    <div className="h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 flex flex-col overflow-hidden">
      <TopBar />
      {/* Main area with sidebar and content - shrinks when terminal opens */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
      {/* Terminal panel spans full width at bottom */}
      {isOpen && <TerminalPanel />}
      {/* Floating pill when panel is closed */}
      <ClaudePill />
    </div>
  );
}

export default function MainLayout() {
  return (
    <ThemeProvider>
      <TerminalProvider>
        <MainLayoutContent />
      </TerminalProvider>
    </ThemeProvider>
  );
}
