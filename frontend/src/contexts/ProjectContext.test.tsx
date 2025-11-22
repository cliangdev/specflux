import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { ProjectProvider, useProject } from "./ProjectContext";
import type { Project } from "../api";

vi.mock("../api", () => ({
  api: {
    projects: {
      listProjects: vi.fn(),
    },
  },
}));

import { api } from "../api";

const mockProjects: Project[] = [
  {
    id: 1,
    projectId: "proj-1",
    name: "Project Alpha",
    localPath: "/path/alpha",
    workflowTemplate: "startup-fast",
    ownerUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    projectId: "proj-2",
    name: "Project Beta",
    localPath: "/path/beta",
    workflowTemplate: "design-first",
    ownerUserId: 1,
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
        success: true,
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
        success: true,
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
        success: true,
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
        success: true,
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
  });
});
