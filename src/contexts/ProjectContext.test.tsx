import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { ProjectProvider, useProject } from "./ProjectContext";
import type { Project } from "../api";

// Mock API
vi.mock("../api", () => ({
  api: {
    projects: {
      listProjects: vi.fn(),
    },
  },
}));

// Create a mutable auth state for testing
const mockAuthState = {
  isSignedIn: true,
  user: { uid: "user_123", email: "user1@example.com" } as { uid: string; email: string } | null,
};

// Mock AuthContext - ProjectContext now depends on useAuth
vi.mock("./AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

import { api } from "../api";

const mockProjects: Project[] = [
  {
    id: "proj_abc123",
    projectKey: "ALPHA",
    name: "Project Alpha",
    ownerId: "user_123",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "proj_def456",
    projectKey: "BETA",
    name: "Project Beta",
    ownerId: "user_123",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function TestConsumer() {
  const { projects, currentProject, loading, error } = useProject();
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "loaded"}</span>
      <span data-testid="error">{error || "no-error"}</span>
      <span data-testid="projects-count">{projects.length}</span>
      <span data-testid="current-project">
        {currentProject?.name || "none"}
      </span>
    </div>
  );
}

describe("ProjectContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset mock auth state to default
    mockAuthState.isSignedIn = true;
    mockAuthState.user = { uid: "user_123", email: "user1@example.com" };
  });

  describe("ProjectProvider", () => {
    it("shows loading state initially", () => {
      vi.mocked(api.projects.listProjects).mockImplementation(
        () => new Promise(() => {}),
      );

      render(
        <ProjectProvider>
          <TestConsumer />
        </ProjectProvider>,
      );

      expect(screen.getByTestId("loading")).toHaveTextContent("loading");
    });

    it("loads projects and auto-selects first one", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      render(
        <ProjectProvider>
          <TestConsumer />
        </ProjectProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      expect(screen.getByTestId("projects-count")).toHaveTextContent("2");
      expect(screen.getByTestId("current-project")).toHaveTextContent(
        "Project Alpha",
      );
    });

    it("handles API errors", async () => {
      vi.mocked(api.projects.listProjects).mockRejectedValue(
        new Error("Network error"),
      );

      render(
        <ProjectProvider>
          <TestConsumer />
        </ProjectProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      expect(screen.getByTestId("error")).toHaveTextContent("Network error");
    });

    it("handles empty project list", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [],
      });

      render(
        <ProjectProvider>
          <TestConsumer />
        </ProjectProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      expect(screen.getByTestId("projects-count")).toHaveTextContent("0");
      expect(screen.getByTestId("current-project")).toHaveTextContent("none");
    });
  });

  describe("useProject hook", () => {
    it("throws when used outside provider", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useProject());
      }).toThrow("useProject must be used within a ProjectProvider");

      consoleSpy.mockRestore();
    });

    it("provides selectProject function", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider>{children}</ProjectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentProject?.name).toBe("Project Alpha");

      act(() => {
        result.current.selectProject(mockProjects[1]);
      });

      expect(result.current.currentProject?.name).toBe("Project Beta");
    });

    it("provides refreshProjects function", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider>{children}</ProjectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callsBefore = vi.mocked(api.projects.listProjects).mock.calls
        .length;

      await act(async () => {
        await result.current.refreshProjects();
      });

      expect(api.projects.listProjects).toHaveBeenCalledTimes(callsBefore + 1);
    });

    it("selectProject returns default route when no saved route", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider>{children}</ProjectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let targetRoute: string = "";
      act(() => {
        targetRoute = result.current.selectProject(mockProjects[1]);
      });

      expect(targetRoute).toBe("/board");
    });

    it("selectProject returns saved route for project", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      // Set up saved routes in localStorage (must also set last_user_id to prevent clear)
      localStorage.setItem("specflux_last_user_id", "user_123");
      localStorage.setItem(
        "specflux_project_routes",
        JSON.stringify({ proj_def456: "/prds/PRD-1" })
      );

      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider>{children}</ProjectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let targetRoute: string = "";
      act(() => {
        targetRoute = result.current.selectProject(mockProjects[1]);
      });

      expect(targetRoute).toBe("/prds/PRD-1");
    });

    it("saveCurrentRoute saves route for current project", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider>{children}</ProjectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Save a route for the current project
      act(() => {
        result.current.saveCurrentRoute("/tasks/TASK-42");
      });

      // Verify it was saved to localStorage
      const savedRoutes = JSON.parse(
        localStorage.getItem("specflux_project_routes") || "{}"
      );
      expect(savedRoutes["proj_abc123"]).toBe("/tasks/TASK-42");
    });

    it("persists selected project to localStorage", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider>{children}</ProjectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.selectProject(mockProjects[1]);
      });

      expect(localStorage.getItem("specflux_selected_project_id")).toBe(
        "proj_def456"
      );
    });

    it("restores saved project from localStorage on load", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      // Pre-set the saved project ID (must also set last_user_id to prevent clear)
      localStorage.setItem("specflux_last_user_id", "user_123");
      localStorage.setItem("specflux_selected_project_id", "proj_def456");

      const { result } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider>{children}</ProjectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should restore Project Beta instead of auto-selecting first
      expect(result.current.currentProject?.name).toBe("Project Beta");
    });
  });

  describe("user change handling", () => {
    it("clears projects when a different user signs in", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      // Set up initial user
      mockAuthState.isSignedIn = true;
      mockAuthState.user = { uid: "user_123", email: "user1@example.com" };
      localStorage.setItem("specflux_last_user_id", "user_123");

      const { result, rerender } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider>{children}</ProjectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projects.length).toBe(2);
      expect(result.current.currentProject?.name).toBe("Project Alpha");

      // Simulate different user signing in
      mockAuthState.user = { uid: "user_456", email: "user2@example.com" };

      // Reset mock to return empty projects for new user
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [],
      });

      // Re-render to trigger effect
      rerender();

      await waitFor(() => {
        expect(result.current.projects.length).toBe(0);
      });

      expect(result.current.currentProject).toBeNull();
      // Verify localStorage was cleared
      expect(localStorage.getItem("specflux_selected_project_id")).toBeNull();
    });

    it("clears projects when user signs out", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      // Set up initial user
      mockAuthState.isSignedIn = true;
      mockAuthState.user = { uid: "user_123", email: "user1@example.com" };
      localStorage.setItem("specflux_last_user_id", "user_123");

      const { result, rerender } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider>{children}</ProjectProvider>
        ),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projects.length).toBe(2);

      // Simulate sign out
      mockAuthState.isSignedIn = false;
      mockAuthState.user = null;

      rerender();

      await waitFor(() => {
        expect(result.current.projects.length).toBe(0);
      });

      expect(result.current.currentProject).toBeNull();
      // Verify last_user_id was cleared on sign out
      expect(localStorage.getItem("specflux_last_user_id")).toBeNull();
    });

    it("clears saved project routes when user changes", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: mockProjects,
      });

      // Set up initial user with saved routes
      mockAuthState.isSignedIn = true;
      mockAuthState.user = { uid: "user_123", email: "user1@example.com" };
      localStorage.setItem("specflux_last_user_id", "user_123");
      localStorage.setItem(
        "specflux_project_routes",
        JSON.stringify({ proj_abc123: "/tasks/TASK-1" })
      );

      const { rerender } = renderHook(() => useProject(), {
        wrapper: ({ children }) => (
          <ProjectProvider>{children}</ProjectProvider>
        ),
      });

      // Simulate different user signing in
      mockAuthState.user = { uid: "user_456", email: "user2@example.com" };
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [],
      });

      rerender();

      await waitFor(() => {
        // Project routes should be cleared when user changes
        expect(localStorage.getItem("specflux_project_routes")).toBeNull();
      });
    });
  });
});
