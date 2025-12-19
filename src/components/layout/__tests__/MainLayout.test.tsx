import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// Mock child components
vi.mock("../TopBar", () => ({
  default: () => <div data-testid="topbar">TopBar</div>,
}));

vi.mock("../Sidebar", () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock("../../terminal/TerminalPanel", () => ({
  default: () => <div data-testid="terminal-panel">TerminalPanel</div>,
}));

vi.mock("../../terminal/ClaudePill", () => ({
  default: () => <div data-testid="claude-pill">ClaudePill</div>,
}));

// Mock terminal context
const mockTerminalContext: {
  isOpen: boolean;
  isCollapsed: boolean;
  panelHeight: number;
  panelWidth: number;
  panelPosition: "bottom" | "left" | "right";
  isMaximized: boolean;
  sessions: unknown[];
  activeSessionId: string | null;
  [key: string]: unknown;
} = {
  isOpen: true,
  isCollapsed: false,
  panelHeight: 320,
  panelWidth: 480,
  panelPosition: "bottom",
  isMaximized: false,
  sessions: [],
  activeSessionId: null,
  togglePanel: vi.fn(),
  openPanel: vi.fn(),
  closePanel: vi.fn(),
  toggleCollapse: vi.fn(),
  setPanelHeight: vi.fn(),
  setPanelWidth: vi.fn(),
  setPanelPosition: vi.fn(),
  toggleMaximize: vi.fn(),
  openTerminalForTask: vi.fn(),
  openTerminalForContext: vi.fn(),
  switchToSession: vi.fn(),
  closeSession: vi.fn(),
  updateSessionStatus: vi.fn(),
  getExistingSession: vi.fn().mockReturnValue(null),
  pageContext: null,
  setPageContext: vi.fn(),
  suggestedCommands: [],
};

vi.mock("../../../contexts/TerminalContext", () => ({
  TerminalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTerminal: () => mockTerminalContext,
}));

// Mock project context
vi.mock("../../../contexts", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useProject: () => ({
    currentProject: null,
    projects: [],
    loading: false,
    setCurrentProject: vi.fn(),
    refreshProjects: vi.fn(),
    saveCurrentRoute: vi.fn(),
    getProjectRef: vi.fn(),
  }),
}));

// Import after mocks
import MainLayout from "../MainLayout";

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe("MainLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTerminalContext.isOpen = true;
    mockTerminalContext.isCollapsed = false;
    mockTerminalContext.panelPosition = "bottom";
  });

  it("renders main layout components", () => {
    renderWithRouter(<MainLayout />);

    expect(screen.getByTestId("topbar")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("claude-pill")).toBeInTheDocument();
  });

  describe("Terminal Panel Persistence", () => {
    it("keeps TerminalPanel mounted when panel is open", () => {
      mockTerminalContext.isOpen = true;

      renderWithRouter(<MainLayout />);

      expect(screen.getByTestId("terminal-panel")).toBeInTheDocument();
    });

    it("keeps TerminalPanel mounted when panel is closed (critical for content persistence)", () => {
      mockTerminalContext.isOpen = false;

      renderWithRouter(<MainLayout />);

      // TerminalPanel should still be in the DOM to preserve terminal content
      expect(screen.getByTestId("terminal-panel")).toBeInTheDocument();
    });

    it("hides terminal container when closed", () => {
      mockTerminalContext.isOpen = false;

      renderWithRouter(<MainLayout />);

      const terminalPanel = screen.getByTestId("terminal-panel");
      const container = terminalPanel.parentElement;

      // Container should be hidden with display: none
      expect(container).toHaveStyle({ display: "none" });
      expect(container).toHaveAttribute("aria-hidden", "true");
    });

    it("shows terminal container with proper positioning when open", () => {
      mockTerminalContext.isOpen = true;
      mockTerminalContext.panelPosition = "bottom";
      mockTerminalContext.panelHeight = 320;

      renderWithRouter(<MainLayout />);

      const terminalPanel = screen.getByTestId("terminal-panel");
      const container = terminalPanel.parentElement;

      // Container should be visible with fixed positioning
      expect(container).toHaveStyle({ position: "fixed" });
      expect(container).toHaveAttribute("aria-hidden", "false");
    });

    it("applies transition classes only when panel is open", () => {
      mockTerminalContext.isOpen = true;

      renderWithRouter(<MainLayout />);

      const terminalPanel = screen.getByTestId("terminal-panel");
      const container = terminalPanel.parentElement;

      expect(container).toHaveClass("transition-[width,height]");
      expect(container).toHaveClass("duration-100");
    });

    it("removes transition classes when panel is closed", () => {
      mockTerminalContext.isOpen = false;

      renderWithRouter(<MainLayout />);

      const terminalPanel = screen.getByTestId("terminal-panel");
      const container = terminalPanel.parentElement;

      expect(container).not.toHaveClass("transition-[width,height]");
    });
  });

  describe("Panel Positions", () => {
    it("positions panel at bottom correctly", () => {
      mockTerminalContext.isOpen = true;
      mockTerminalContext.panelPosition = "bottom";
      mockTerminalContext.panelHeight = 320;

      renderWithRouter(<MainLayout />);

      const container = screen.getByTestId("terminal-panel").parentElement;
      expect(container).toHaveStyle({ bottom: "0px", left: "0px", right: "0px", height: "320px" });
    });

    it("positions panel at left correctly", () => {
      mockTerminalContext.isOpen = true;
      mockTerminalContext.panelPosition = "left";
      mockTerminalContext.panelWidth = 480;

      renderWithRouter(<MainLayout />);

      const container = screen.getByTestId("terminal-panel").parentElement;
      expect(container).toHaveStyle({ left: "0px", bottom: "0px", width: "480px" });
    });

    it("positions panel at right correctly", () => {
      mockTerminalContext.isOpen = true;
      mockTerminalContext.panelPosition = "right";
      mockTerminalContext.panelWidth = 480;

      renderWithRouter(<MainLayout />);

      const container = screen.getByTestId("terminal-panel").parentElement;
      expect(container).toHaveStyle({ right: "0px", bottom: "0px", width: "480px" });
    });
  });
});
