import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProjectSelector from "./ProjectSelector";
import { ProjectProvider } from "../../contexts";
import type { Project } from "../../api";

// Mock AuthContext to simulate signed-in user
vi.mock("../../contexts/AuthContext", () => ({
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

// Mock the api module
vi.mock("../../api", () => ({
  api: {
    projects: {
      listProjects: vi.fn(),
    },
  },
}));

import { api } from "../../api";

const mockProjects: Project[] = [
  {
    id: "proj_1",
    projectKey: "PROJA",
    name: "Project A",
    localPath: "/path/a",
    ownerId: "user_1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "proj_2",
    projectKey: "PROJB",
    name: "Project B",
    localPath: "/path/b",
    ownerId: "user_1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function renderWithProvider() {
  return render(
    <ProjectProvider>
      <ProjectSelector />
    </ProjectProvider>,
  );
}

describe("ProjectSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    vi.mocked(api.projects.listProjects).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderWithProvider();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders projects after loading", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: mockProjects,
    } as any);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Project A");
    });
  });

  it("shows error state on failure with retry button", async () => {
    vi.mocked(api.projects.listProjects).mockRejectedValue(
      new Error("Network error"),
    );

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  it("opens dropdown when clicked", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: mockProjects,
    } as any);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Project A");
    });

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("+ New Project")).toBeInTheDocument();
    expect(screen.getByText("Project B")).toBeInTheDocument();
  });

  it("selects project and closes dropdown", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: mockProjects,
    } as any);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Project A");
    });

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Project B"));

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Project B");
    });
    expect(screen.queryByText("+ New Project")).not.toBeInTheDocument();
  });

  it("shows empty state when no projects", async () => {
    vi.mocked(api.projects.listProjects).mockResolvedValue({
      data: [],
    } as any);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Select Project");
    });

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });
});
