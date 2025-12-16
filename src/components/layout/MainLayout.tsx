import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import { ThemeProvider, useProject } from "../../contexts";
import { TerminalProvider, useTerminal } from "../../contexts/TerminalContext";
import TerminalPanel from "../terminal/TerminalPanel";
import ClaudePill from "../terminal/ClaudePill";

const TOPBAR_HEIGHT = 48;

function MainLayoutContent() {
  const { isOpen, togglePanel, sessions, switchToSession, openPanel, panelPosition, panelHeight, panelWidth, isCollapsed } =
    useTerminal();
  const { saveCurrentRoute } = useProject();
  const location = useLocation();

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    saveCurrentRoute(fullPath);
  }, [location.pathname, location.search, saveCurrentRoute]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "t") {
        e.preventDefault();
        togglePanel();
        return;
      }

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

  const getContentStyle = (): React.CSSProperties => {
    if (!isOpen) return {};
    const collapsedSize = 40;

    switch (panelPosition) {
      case "left":
        return { marginLeft: isCollapsed ? collapsedSize : panelWidth };
      case "right":
        return { marginRight: isCollapsed ? collapsedSize : panelWidth };
      case "bottom":
      default:
        return { marginBottom: isCollapsed ? collapsedSize : panelHeight };
    }
  };

  const getTerminalStyle = (): React.CSSProperties => {
    const collapsedSize = 40;
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 40,
    };

    switch (panelPosition) {
      case "left":
        return {
          ...base,
          top: TOPBAR_HEIGHT,
          left: 0,
          bottom: 0,
          width: isCollapsed ? collapsedSize : panelWidth,
        };
      case "right":
        return {
          ...base,
          top: TOPBAR_HEIGHT,
          right: 0,
          bottom: 0,
          width: isCollapsed ? collapsedSize : panelWidth,
        };
      case "bottom":
      default:
        return {
          ...base,
          bottom: 0,
          left: 0,
          right: 0,
          height: isCollapsed ? collapsedSize : panelHeight,
        };
    }
  };

  return (
    <div className="h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 flex flex-col overflow-hidden">
      <TopBar />
      <div
        className="flex flex-1 overflow-hidden min-h-0 transition-[margin] duration-100 ease-out"
        style={getContentStyle()}
      >
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
      <div
        style={isOpen ? getTerminalStyle() : { position: 'fixed', left: '-9999px', visibility: 'hidden' }}
        className={isOpen ? "transition-[width,height] duration-100 ease-out" : ""}
        aria-hidden={!isOpen}
      >
        <TerminalPanel />
      </div>
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
