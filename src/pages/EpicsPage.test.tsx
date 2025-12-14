import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import EpicsPage from "./EpicsPage";
import { ProjectProvider } from "../contexts";
import type { Epic, Project, Prd, Release } from "../api";

// Mock AuthContext to simulate signed-in user
vi.mock("../contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { uid: "user_123", email: "test@example.com" },
    loading: false,
    isSignedIn: true,
    signInWithEmail: vi.fn(),
    signInWithGitHub: vi.fn(),
    signOut: vi.fn(),
    getIdToken: vi.fn().mockResolvedValue("mock-token"),
    error: null,
  }),
}));

// Mock TerminalContext
vi.mock("../contexts/TerminalContext", () => ({
  useTerminal: () => ({
    sessions: [],
    activeSessionId: null,
    showPanel: false,
    createSession: vi.fn(),
    closeSession: vi.fn(),
    setActiveSession: vi.fn(),
    togglePanel: vi.fn(),
    openPanel: vi.fn(),
    closePanel: vi.fn(),
    resizePanel: vi.fn(),
    panelSize: 300,
    openTerminalForContext: vi.fn(),
    activeTask: null,
    isRunning: false,
    pageContext: null,
    setPageContext: vi.fn(),
    suggestedCommands: [],
  }),
  TerminalProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock usePageContext hook
vi.mock("../hooks/usePageContext", () => ({
  usePageContext: vi.fn(),
}));

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    api: {
      projects: {
        listProjects: vi.fn(),
      },
      epics: {
        listEpics: vi.fn(),
      },
      releases: {
        listReleases: vi.fn(),
      },
      prds: {
        listPrds: vi.fn(),
      },
    },
  };
});

import { api } from "../api";

const mockProject1: Project = {
  id: "proj_123",
  projectKey: "PROJ-1",
  name: "Project One",
  ownerId: "user_123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProject2: Project = {
  id: "proj_456",
  projectKey: "PROJ-2",
  name: "Project Two",
  ownerId: "user_123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrd1: Prd = {
  id: "prd_abc",
  displayKey: "PRD-1",
  projectId: "proj_123",
  title: "PRD for Project One",
  status: "APPROVED",
  createdById: "user_123",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockRelease1: Release = {
  id: "rel_123",
  displayKey: "REL-1",
  name: "v1.0",
  projectId: "proj_123",
  status: "PLANNING",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEpics: Epic[] = [
  {
    id: 1,
    displayKey: "EPIC-1",
    title: "Epic One",
    status: "PLANNING",
    projectId: 1,
    createdByUserId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    displayKey: "EPIC-2",
    title: "Epic Two",
    status: "IN_PROGRESS",
    projectId: 1,
    createdByUserId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function renderWithProvider() {
  return render(
    <MemoryRouter>
      <ProjectProvider>
        <EpicsPage />
      </ProjectProvider>
    </MemoryRouter>,
  );
}

describe("EpicsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mocks
    vi.mocked(api.releases.listReleases).mockResolvedValue({
      data: [],
      pagination: { hasMore: false },
    });
    vi.mocked(api.prds.listPrds).mockResolvedValue({
      data: [],
      pagination: { hasMore: false },
    });
  });

  describe("basic functionality", () => {
    it("shows message when no project is selected", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [],
        pagination: { hasMore: false },
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText("No project selected")).toBeInTheDocument();
      });
    });

    it("shows loading state while fetching epics", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [mockProject1],
        pagination: { hasMore: false },
      });
      vi.mocked(api.epics.listEpics).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      renderWithProvider();

      await waitFor(() => {
        const spinner = document.querySelector(".animate-spin");
        expect(spinner).toBeInTheDocument();
      });
    });

    it("shows empty state when no epics exist", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [mockProject1],
        pagination: { hasMore: false },
      });
      vi.mocked(api.epics.listEpics).mockResolvedValue({
        data: [],
        pagination: { hasMore: false },
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText("No epics")).toBeInTheDocument();
      });
    });

    it("renders epics as cards", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [mockProject1],
        pagination: { hasMore: false },
      });
      vi.mocked(api.epics.listEpics).mockResolvedValue({
        data: mockEpics,
        pagination: { hasMore: false },
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText("Epic One")).toBeInTheDocument();
        expect(screen.getByText("Epic Two")).toBeInTheDocument();
      });
    });

    it("shows error state on API failure", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [mockProject1],
        pagination: { hasMore: false },
      });
      vi.mocked(api.epics.listEpics).mockRejectedValue(
        new Error("Failed to fetch"),
      );

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText("Error loading epics")).toBeInTheDocument();
      });
    });

    it("has a create epic button", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [mockProject1],
        pagination: { hasMore: false },
      });
      vi.mocked(api.epics.listEpics).mockResolvedValue({
        data: [],
        pagination: { hasMore: false },
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText("Create Epic")).toBeInTheDocument();
      });
    });
  });

  describe("filter behavior", () => {
    it("has status, release, and PRD filter dropdowns", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [mockProject1],
        pagination: { hasMore: false },
      });
      vi.mocked(api.epics.listEpics).mockResolvedValue({
        data: mockEpics,
        pagination: { hasMore: false },
      });
      vi.mocked(api.prds.listPrds).mockResolvedValue({
        data: [mockPrd1],
        pagination: { hasMore: false },
      });
      vi.mocked(api.releases.listReleases).mockResolvedValue({
        data: [mockRelease1],
        pagination: { hasMore: false },
      });

      renderWithProvider();

      await waitFor(() => {
        const comboboxes = screen.getAllByRole("combobox");
        expect(comboboxes.length).toBe(3); // Status, Release, PRD
      });
    });
  });

  describe("stale filter handling on project switch", () => {
    it("clears PRD filter when switching to a project without that PRD", async () => {
      // Set up a stale PRD filter in localStorage from a previous project
      localStorage.setItem(
        "specflux-epics-filters",
        JSON.stringify({
          status: "",
          release: "",
          prd: "prd_nonexistent", // This PRD doesn't exist in the new project
        }),
      );

      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [mockProject2], // Different project
        pagination: { hasMore: false },
      });
      vi.mocked(api.epics.listEpics).mockResolvedValue({
        data: [],
        pagination: { hasMore: false },
      });
      vi.mocked(api.prds.listPrds).mockResolvedValue({
        data: [], // No PRDs in this project
        pagination: { hasMore: false },
      });

      renderWithProvider();

      await waitFor(() => {
        // Should show empty state, not an error
        expect(screen.getByText("No epics")).toBeInTheDocument();
      });

      // Should NOT show error from stale PRD filter
      expect(screen.queryByText("Error loading epics")).not.toBeInTheDocument();
    });

    it("does not send stale PRD filter to API after project switch", async () => {
      // Set up a stale PRD filter
      localStorage.setItem(
        "specflux-epics-filters",
        JSON.stringify({
          status: "",
          release: "",
          prd: "prd_from_old_project",
        }),
      );

      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [mockProject2],
        pagination: { hasMore: false },
      });
      vi.mocked(api.epics.listEpics).mockResolvedValue({
        data: [],
        pagination: { hasMore: false },
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText("No epics")).toBeInTheDocument();
      });

      // The API should eventually be called without the stale prdRef
      // (either initially empty or cleared after project change)
      const calls = vi.mocked(api.epics.listEpics).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].prdRef).toBeUndefined();
    });

    it("clears release filter when switching projects", async () => {
      // Set up a stale release filter
      localStorage.setItem(
        "specflux-epics-filters",
        JSON.stringify({
          status: "",
          release: "rel_from_old_project",
          prd: "",
        }),
      );

      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [mockProject2],
        pagination: { hasMore: false },
      });
      vi.mocked(api.epics.listEpics).mockResolvedValue({
        data: mockEpics,
        pagination: { hasMore: false },
      });
      vi.mocked(api.releases.listReleases).mockResolvedValue({
        data: [], // No releases in this project
        pagination: { hasMore: false },
      });

      renderWithProvider();

      await waitFor(() => {
        // Should show epics (not filtered out by stale release filter)
        expect(screen.getByText("Epic One")).toBeInTheDocument();
      });
    });
  });

  describe("view modes", () => {
    it("has view toggle buttons for cards and graph", async () => {
      vi.mocked(api.projects.listProjects).mockResolvedValue({
        data: [mockProject1],
        pagination: { hasMore: false },
      });
      vi.mocked(api.epics.listEpics).mockResolvedValue({
        data: mockEpics,
        pagination: { hasMore: false },
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTitle("Card view")).toBeInTheDocument();
        expect(screen.getByTitle("Dependency graph view")).toBeInTheDocument();
      });
    });
  });
});
