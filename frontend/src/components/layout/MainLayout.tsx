import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import { ThemeProvider } from "../../contexts";
import { TerminalProvider, useTerminal } from "../../contexts/TerminalContext";
import TerminalPanel from "../terminal/TerminalPanel";

function MainLayoutContent() {
  const { isOpen, togglePanel } = useTerminal();

  // Global keyboard shortcut: Cmd+` to toggle terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "`") {
        e.preventDefault();
        togglePanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePanel]);

  return (
    <div className="h-screen bg-system-50 dark:bg-system-950 text-system-900 dark:text-system-100 flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-6 scrollbar-thin">
            <Outlet />
          </div>
          {isOpen && <TerminalPanel />}
        </main>
      </div>
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
