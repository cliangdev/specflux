import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

// Mock the AuthContext to simulate signed-in user
vi.mock("./contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    isSignedIn: true,
    loading: false,
    user: { uid: "test-user", email: "test@example.com" },
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

// Mock the ProjectContext to avoid API calls during tests
vi.mock("./contexts/ProjectContext", () => ({
  ProjectProvider: ({ children }: { children: React.ReactNode }) => children,
  useProject: () => ({
    projects: [
      {
        id: "test-project-1",
        projectKey: "TEST",
        name: "Test Project",
        description: "A test project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    currentProject: {
      id: "test-project-1",
      projectKey: "TEST",
      name: "Test Project",
      description: "A test project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    loading: false,
    error: null,
    selectProject: vi.fn(),
    refreshProjects: vi.fn(),
    getProjectRef: () => "TEST",
  }),
}));

// Mock the ThemeContext to avoid localStorage access
vi.mock("./contexts/ThemeContext", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    theme: "light" as const,
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

// Mock the TerminalContext to avoid terminal operations
vi.mock("./contexts/TerminalContext", () => ({
  TerminalProvider: ({ children }: { children: React.ReactNode }) => children,
  useTerminal: () => ({
    terminals: [],
    activeTerminalId: null,
    openTerminalForTask: vi.fn(),
    closeTerminal: vi.fn(),
    setActiveTerminal: vi.fn(),
    pageContext: null,
    setPageContext: vi.fn(),
    suggestedCommands: [],
  }),
}));

// Mock usePageContext hook
vi.mock("./hooks/usePageContext", () => ({
  usePageContext: vi.fn(),
}));

// Mock Firebase
vi.mock("./lib/firebase", () => ({
  getIdToken: vi.fn().mockResolvedValue("mock-token"),
}));

// Mock the API - use importOriginal to preserve type exports
vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    api: {
      projects: {
        listProjects: vi
          .fn()
          .mockResolvedValue({ data: [], pagination: { hasMore: false } }),
      },
      users: {
        getCurrentUser: vi
          .fn()
          .mockResolvedValue({ id: "user_1", email: "test@example.com" }),
      },
      tasks: {
        listTasks: vi
          .fn()
          .mockResolvedValue({ data: [], pagination: { hasMore: false } }),
        updateTask: vi.fn().mockResolvedValue({}),
      },
    },
  };
});

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it("displays the SpecFlux logo", () => {
    render(<App />);
    expect(screen.getByText("SF")).toBeInTheDocument();
  });

  it("displays the top bar with brand name", () => {
    render(<App />);
    const topBar = screen.getByRole("banner");
    expect(topBar).toHaveTextContent("SpecFlux");
  });

  it("displays the sidebar navigation links", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: /board/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /roadmap/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /files/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  it("redirects to board page by default", async () => {
    render(<App />);
    // Wait for the board to load (API call completes)
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Board",
    );
  });
});
