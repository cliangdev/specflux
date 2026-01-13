import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock the useAutoSync hook before importing the context
vi.mock("../../hooks/useAutoSync", () => ({
  useAutoSync: vi.fn(),
}));

vi.mock("../ProjectContext", () => ({
  useProject: vi.fn(),
}));

import {
  AutoSyncProvider,
  useAutoSyncContext,
  useAutoSyncContextSafe,
} from "../AutoSyncContext";
import { useAutoSync } from "../../hooks/useAutoSync";
import { useProject } from "../ProjectContext";

describe("AutoSyncContext", () => {
  const mockSyncState = {
    status: "watching" as const,
    pendingChanges: 0,
    isOnline: true,
    lastSyncedAt: null,
    triggerSync: vi.fn(),
    triggerPull: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAutoSync).mockReturnValue(mockSyncState);
    vi.mocked(useProject).mockReturnValue({
      currentProject: {
        id: "proj_123",
        projectKey: "TEST",
        name: "Test Project",
        localPath: "/test/path",
        ownerId: "user_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      projects: [],
      loading: false,
      error: null,
      selectProject: vi.fn(),
      refreshProjects: vi.fn(),
      getProjectRef: vi.fn(),
      saveCurrentRoute: vi.fn(),
    });
  });

  describe("AutoSyncProvider", () => {
    it("renders children", () => {
      render(
        <AutoSyncProvider>
          <div data-testid="child">Child content</div>
        </AutoSyncProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("initializes useAutoSync with project localPath", () => {
      render(
        <AutoSyncProvider>
          <div>Child</div>
        </AutoSyncProvider>
      );

      expect(useAutoSync).toHaveBeenCalledWith(
        expect.objectContaining({
          repoPath: "/test/path",
          enabled: true,
          debounceMs: 30000,
          pullOnFocus: true,
        })
      );
    });

    it("disables sync when no localPath", () => {
      vi.mocked(useProject).mockReturnValue({
        currentProject: {
          id: "proj_123",
          projectKey: "TEST",
          name: "Test Project",
          localPath: undefined,
          ownerId: "user_123",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        projects: [],
        loading: false,
        error: null,
        selectProject: vi.fn(),
        refreshProjects: vi.fn(),
        getProjectRef: vi.fn(),
        saveCurrentRoute: vi.fn(),
      });

      render(
        <AutoSyncProvider>
          <div>Child</div>
        </AutoSyncProvider>
      );

      expect(useAutoSync).toHaveBeenCalledWith(
        expect.objectContaining({
          repoPath: undefined,
          enabled: false,
        })
      );
    });

    it("disables sync when no project", () => {
      vi.mocked(useProject).mockReturnValue({
        currentProject: null,
        projects: [],
        loading: false,
        error: null,
        selectProject: vi.fn(),
        refreshProjects: vi.fn(),
        getProjectRef: vi.fn(),
        saveCurrentRoute: vi.fn(),
      });

      render(
        <AutoSyncProvider>
          <div>Child</div>
        </AutoSyncProvider>
      );

      expect(useAutoSync).toHaveBeenCalledWith(
        expect.objectContaining({
          repoPath: undefined,
          enabled: false,
        })
      );
    });
  });

  describe("useAutoSyncContext", () => {
    it("returns sync state from provider", () => {
      const TestComponent = () => {
        const context = useAutoSyncContext();
        return <div data-testid="status">{context.status}</div>;
      };

      render(
        <AutoSyncProvider>
          <TestComponent />
        </AutoSyncProvider>
      );

      expect(screen.getByTestId("status")).toHaveTextContent("watching");
    });

    it("throws error when used outside provider", () => {
      const TestComponent = () => {
        useAutoSyncContext();
        return null;
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        "useAutoSyncContext must be used within an AutoSyncProvider"
      );

      consoleSpy.mockRestore();
    });

    it("exposes all sync state properties", () => {
      const TestComponent = () => {
        const context = useAutoSyncContext();
        return (
          <div>
            <span data-testid="status">{context.status}</span>
            <span data-testid="pending">{context.pendingChanges}</span>
            <span data-testid="online">{String(context.isOnline)}</span>
            <span data-testid="lastSynced">
              {context.lastSyncedAt?.toISOString() || "null"}
            </span>
          </div>
        );
      };

      render(
        <AutoSyncProvider>
          <TestComponent />
        </AutoSyncProvider>
      );

      expect(screen.getByTestId("status")).toHaveTextContent("watching");
      expect(screen.getByTestId("pending")).toHaveTextContent("0");
      expect(screen.getByTestId("online")).toHaveTextContent("true");
      expect(screen.getByTestId("lastSynced")).toHaveTextContent("null");
    });

    it("exposes triggerSync function", () => {
      const TestComponent = () => {
        const context = useAutoSyncContext();
        return (
          <button onClick={() => context.triggerSync()}>Sync</button>
        );
      };

      render(
        <AutoSyncProvider>
          <TestComponent />
        </AutoSyncProvider>
      );

      screen.getByText("Sync").click();
      expect(mockSyncState.triggerSync).toHaveBeenCalled();
    });

    it("exposes triggerPull function", () => {
      const TestComponent = () => {
        const context = useAutoSyncContext();
        return (
          <button onClick={() => context.triggerPull()}>Pull</button>
        );
      };

      render(
        <AutoSyncProvider>
          <TestComponent />
        </AutoSyncProvider>
      );

      screen.getByText("Pull").click();
      expect(mockSyncState.triggerPull).toHaveBeenCalled();
    });
  });

  describe("useAutoSyncContextSafe", () => {
    it("returns sync state from provider", () => {
      const TestComponent = () => {
        const context = useAutoSyncContextSafe();
        return <div data-testid="status">{context?.status || "none"}</div>;
      };

      render(
        <AutoSyncProvider>
          <TestComponent />
        </AutoSyncProvider>
      );

      expect(screen.getByTestId("status")).toHaveTextContent("watching");
    });

    it("returns null when used outside provider (does not throw)", () => {
      const TestComponent = () => {
        const context = useAutoSyncContextSafe();
        return <div data-testid="result">{context ? "has context" : "null"}</div>;
      };

      render(<TestComponent />);

      expect(screen.getByTestId("result")).toHaveTextContent("null");
    });
  });

  describe("callback configuration", () => {
    it("passes onError callback to useAutoSync", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <AutoSyncProvider>
          <div>Child</div>
        </AutoSyncProvider>
      );

      // Get the onError callback that was passed
      const call = vi.mocked(useAutoSync).mock.calls[0][0];
      expect(call.onError).toBeDefined();

      // Verify it logs to console
      call.onError?.("test error", "push");
      expect(consoleSpy).toHaveBeenCalledWith("[AutoSync] push failed:", "test error");

      consoleSpy.mockRestore();
    });

    it("passes onConflict callback to useAutoSync", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      render(
        <AutoSyncProvider>
          <div>Child</div>
        </AutoSyncProvider>
      );

      // Get the onConflict callback that was passed
      const call = vi.mocked(useAutoSync).mock.calls[0][0];
      expect(call.onConflict).toBeDefined();

      // Verify it logs to console
      call.onConflict?.();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[AutoSync] Conflict detected - manual resolution required"
      );

      consoleSpy.mockRestore();
    });
  });
});
