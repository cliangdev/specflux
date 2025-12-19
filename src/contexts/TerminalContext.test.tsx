import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { TerminalProvider, useTerminal } from "./TerminalContext";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

function TestConsumer() {
  const {
    isOpen,
    isCollapsed,
    activeSession,
    isRunning,
    togglePanel,
    openPanel,
    closePanel,
    toggleCollapse,
    openTerminalForContext,
    setIsRunning,
    pageContext,
    setPageContext,
    suggestedCommands,
    panelPosition,
    panelWidth,
    setPanelPosition,
    setPanelWidth,
  } = useTerminal();

  return (
    <div>
      <span data-testid="is-open">{isOpen ? "open" : "closed"}</span>
      <span data-testid="is-collapsed">
        {isCollapsed ? "collapsed" : "expanded"}
      </span>
      <span data-testid="active-task">{activeSession?.contextTitle || "none"}</span>
      <span data-testid="is-running">{isRunning ? "running" : "idle"}</span>
      <span data-testid="page-context">
        {pageContext ? `${pageContext.type}:${pageContext.id || ""}` : "none"}
      </span>
      <span data-testid="suggested-commands">
        {suggestedCommands.length}
      </span>
      <span data-testid="panel-position">{panelPosition}</span>
      <span data-testid="panel-width">{panelWidth}</span>
      <button data-testid="toggle-panel" onClick={togglePanel}>
        Toggle
      </button>
      <button data-testid="open-panel" onClick={openPanel}>
        Open
      </button>
      <button data-testid="close-panel" onClick={closePanel}>
        Close
      </button>
      <button data-testid="toggle-collapse" onClick={toggleCollapse}>
        Collapse
      </button>
      <button
        data-testid="open-for-task"
        onClick={() => openTerminalForContext({ type: "task", id: "task_1", title: "Test Task" })}
      >
        Open Task
      </button>
      <button data-testid="set-running" onClick={() => setIsRunning(true)}>
        Set Running
      </button>
      <button
        data-testid="set-page-context"
        onClick={() =>
          setPageContext({ type: "task-detail", id: "task_123", title: "Test Task" })
        }
      >
        Set Page Context
      </button>
      <button
        data-testid="clear-page-context"
        onClick={() => setPageContext(null)}
      >
        Clear Page Context
      </button>
      <button
        data-testid="set-position-left"
        onClick={() => setPanelPosition("left")}
      >
        Position Left
      </button>
      <button
        data-testid="set-position-right"
        onClick={() => setPanelPosition("right")}
      >
        Position Right
      </button>
      <button
        data-testid="set-position-bottom"
        onClick={() => setPanelPosition("bottom")}
      >
        Position Bottom
      </button>
      <button
        data-testid="set-panel-width"
        onClick={() => setPanelWidth(600)}
      >
        Set Width 600
      </button>
    </div>
  );
}

describe("TerminalContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe("TerminalProvider", () => {
    it("starts with panel closed by default", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      expect(screen.getByTestId("is-open")).toHaveTextContent("closed");
      expect(screen.getByTestId("is-collapsed")).toHaveTextContent("expanded");
      expect(screen.getByTestId("active-task")).toHaveTextContent("none");
      expect(screen.getByTestId("is-running")).toHaveTextContent("idle");
    });

    it("toggles panel open and closed", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      expect(screen.getByTestId("is-open")).toHaveTextContent("closed");

      act(() => {
        screen.getByTestId("toggle-panel").click();
      });

      expect(screen.getByTestId("is-open")).toHaveTextContent("open");

      act(() => {
        screen.getByTestId("toggle-panel").click();
      });

      expect(screen.getByTestId("is-open")).toHaveTextContent("closed");
    });

    it("opens panel with openPanel()", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      act(() => {
        screen.getByTestId("open-panel").click();
      });

      expect(screen.getByTestId("is-open")).toHaveTextContent("open");
      expect(screen.getByTestId("is-collapsed")).toHaveTextContent("expanded");
    });

    it("closes panel with closePanel()", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      act(() => {
        screen.getByTestId("open-panel").click();
      });

      expect(screen.getByTestId("is-open")).toHaveTextContent("open");

      act(() => {
        screen.getByTestId("close-panel").click();
      });

      expect(screen.getByTestId("is-open")).toHaveTextContent("closed");
    });

    it("toggles collapse state", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      expect(screen.getByTestId("is-collapsed")).toHaveTextContent("expanded");

      act(() => {
        screen.getByTestId("toggle-collapse").click();
      });

      expect(screen.getByTestId("is-collapsed")).toHaveTextContent("collapsed");

      act(() => {
        screen.getByTestId("toggle-collapse").click();
      });

      expect(screen.getByTestId("is-collapsed")).toHaveTextContent("expanded");
    });

    it("opens terminal for a task", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      act(() => {
        screen.getByTestId("open-for-task").click();
      });

      expect(screen.getByTestId("is-open")).toHaveTextContent("open");
      expect(screen.getByTestId("is-collapsed")).toHaveTextContent("expanded");
      expect(screen.getByTestId("active-task")).toHaveTextContent("Test Task");
    });

    it("tracks running state", async () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      expect(screen.getByTestId("is-running")).toHaveTextContent("idle");

      // First open a task (required for setIsRunning to work in multi-tab model)
      act(() => {
        screen.getByTestId("open-for-task").click();
      });

      act(() => {
        screen.getByTestId("set-running").click();
      });

      // Status updates are debounced, so wait for the update to be applied
      await waitFor(() => {
        expect(screen.getByTestId("is-running")).toHaveTextContent("running");
      });
    });

    it("persists state to localStorage", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      act(() => {
        screen.getByTestId("open-panel").click();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "specflux-terminal-panel",
        expect.stringContaining('"isOpen":true'),
      );
    });

    it("restores state from localStorage", () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ isOpen: true, isCollapsed: true }),
      );

      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      expect(screen.getByTestId("is-open")).toHaveTextContent("open");
      expect(screen.getByTestId("is-collapsed")).toHaveTextContent("collapsed");
    });

    it("starts with no page context", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      expect(screen.getByTestId("page-context")).toHaveTextContent("none");
      expect(screen.getByTestId("suggested-commands")).toHaveTextContent("0");
    });

    it("sets and clears page context", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      act(() => {
        screen.getByTestId("set-page-context").click();
      });

      expect(screen.getByTestId("page-context")).toHaveTextContent(
        "task-detail:task_123",
      );

      act(() => {
        screen.getByTestId("clear-page-context").click();
      });

      expect(screen.getByTestId("page-context")).toHaveTextContent("none");
    });

    it("provides suggested commands based on page context", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      // No commands when no context
      expect(screen.getByTestId("suggested-commands")).toHaveTextContent("0");

      act(() => {
        screen.getByTestId("set-page-context").click();
      });

      // Should have suggested commands for task-detail context
      expect(
        parseInt(screen.getByTestId("suggested-commands").textContent || "0"),
      ).toBeGreaterThan(0);
    });
  });

  describe("useTerminal hook", () => {
    it("throws when used outside provider", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTerminal());
      }).toThrow("useTerminal must be used within a TerminalProvider");

      consoleSpy.mockRestore();
    });

    it("provides all expected functions", () => {
      const { result } = renderHook(() => useTerminal(), {
        wrapper: ({ children }) => (
          <TerminalProvider>{children}</TerminalProvider>
        ),
      });

      expect(typeof result.current.togglePanel).toBe("function");
      expect(typeof result.current.openPanel).toBe("function");
      expect(typeof result.current.closePanel).toBe("function");
      expect(typeof result.current.toggleCollapse).toBe("function");
      expect(typeof result.current.openTerminalForContext).toBe("function");
      expect(typeof result.current.closeSession).toBe("function");
      expect(typeof result.current.switchToSession).toBe("function");
      expect(typeof result.current.updateSessionStatus).toBe("function");
      expect(typeof result.current.setIsRunning).toBe("function");
      expect(typeof result.current.setPageContext).toBe("function");
    });

    it("provides page context values", () => {
      const { result } = renderHook(() => useTerminal(), {
        wrapper: ({ children }) => (
          <TerminalProvider>{children}</TerminalProvider>
        ),
      });

      expect(result.current.pageContext).toBeNull();
      expect(Array.isArray(result.current.suggestedCommands)).toBe(true);
    });

    it("provides position-related functions", () => {
      const { result } = renderHook(() => useTerminal(), {
        wrapper: ({ children }) => (
          <TerminalProvider>{children}</TerminalProvider>
        ),
      });

      expect(typeof result.current.setPanelPosition).toBe("function");
      expect(typeof result.current.setPanelWidth).toBe("function");
      expect(result.current.panelPosition).toBe("bottom");
      expect(result.current.panelWidth).toBe(480);
    });
  });

  describe("Session with initialPrompt", () => {
    it("stores initialPrompt in session", () => {
      const { result } = renderHook(() => useTerminal(), {
        wrapper: ({ children }) => (
          <TerminalProvider>{children}</TerminalProvider>
        ),
      });

      act(() => {
        result.current.openTerminalForContext({
          type: "task",
          id: "task_123",
          title: "Test Task",
          initialPrompt: "Hello Claude, help me with this task",
        });
      });

      expect(result.current.activeSession?.initialPrompt).toBe(
        "Hello Claude, help me with this task"
      );
    });

    it("persists initialPrompt to localStorage", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      const { result } = renderHook(() => useTerminal(), {
        wrapper: ({ children }) => (
          <TerminalProvider>{children}</TerminalProvider>
        ),
      });

      act(() => {
        result.current.openTerminalForContext({
          type: "prd",
          id: "prd_1",
          title: "Test PRD",
          initialPrompt: "Work on this PRD",
        });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "specflux-terminal-panel",
        expect.stringContaining('"initialPrompt":"Work on this PRD"'),
      );
    });

    it("restores session with initialPrompt from localStorage", () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          isOpen: true,
          sessions: [
            {
              id: "epic-epic_1",
              contextType: "epic",
              contextId: "epic_1",
              contextTitle: "Test Epic",
              initialPrompt: "Implement this epic",
            },
          ],
          activeSessionId: "epic-epic_1",
        }),
      );

      const { result } = renderHook(() => useTerminal(), {
        wrapper: ({ children }) => (
          <TerminalProvider>{children}</TerminalProvider>
        ),
      });

      expect(result.current.activeSession?.initialPrompt).toBe(
        "Implement this epic"
      );
    });
  });

  describe("Panel Position", () => {
    it("defaults to bottom position", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      expect(screen.getByTestId("panel-position")).toHaveTextContent("bottom");
    });

    it("changes position to left", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      act(() => {
        screen.getByTestId("set-position-left").click();
      });

      expect(screen.getByTestId("panel-position")).toHaveTextContent("left");
    });

    it("changes position to right", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      act(() => {
        screen.getByTestId("set-position-right").click();
      });

      expect(screen.getByTestId("panel-position")).toHaveTextContent("right");
    });

    it("changes position back to bottom", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      act(() => {
        screen.getByTestId("set-position-left").click();
      });

      expect(screen.getByTestId("panel-position")).toHaveTextContent("left");

      act(() => {
        screen.getByTestId("set-position-bottom").click();
      });

      expect(screen.getByTestId("panel-position")).toHaveTextContent("bottom");
    });

    it("persists position to localStorage", () => {
      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      act(() => {
        screen.getByTestId("set-position-right").click();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "specflux-terminal-panel",
        expect.stringContaining('"panelPosition":"right"'),
      );
    });

    it("restores position from localStorage", () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ panelPosition: "left", panelWidth: 500 }),
      );

      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      expect(screen.getByTestId("panel-position")).toHaveTextContent("left");
      expect(screen.getByTestId("panel-width")).toHaveTextContent("500");
    });

    it("updates panel width", () => {
      // Reset localStorage mock to return null (default state)
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.clear();

      render(
        <TerminalProvider>
          <TestConsumer />
        </TerminalProvider>,
      );

      expect(screen.getByTestId("panel-width")).toHaveTextContent("480");

      act(() => {
        screen.getByTestId("set-panel-width").click();
      });

      expect(screen.getByTestId("panel-width")).toHaveTextContent("600");
    });

    it("clamps panel width to maximum", () => {
      // Mock window.innerWidth
      Object.defineProperty(window, "innerWidth", { value: 1000, writable: true });

      const { result } = renderHook(() => useTerminal(), {
        wrapper: ({ children }) => (
          <TerminalProvider>{children}</TerminalProvider>
        ),
      });

      // Try to set width larger than 60% of window (600px)
      act(() => {
        result.current.setPanelWidth(800);
      });

      // Should be clamped to max (60% of 1000 = 600)
      expect(result.current.panelWidth).toBe(600);
    });

    it("clamps panel width to minimum", () => {
      const { result } = renderHook(() => useTerminal(), {
        wrapper: ({ children }) => (
          <TerminalProvider>{children}</TerminalProvider>
        ),
      });

      // Try to set width smaller than minimum (300px)
      act(() => {
        result.current.setPanelWidth(100);
      });

      // Should be clamped to min (300)
      expect(result.current.panelWidth).toBe(300);
    });
  });
});
