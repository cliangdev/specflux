import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock Tauri plugins
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...args: string[]) => args.join("/")),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  ask: vi.fn(),
}));

// Mock the api module
vi.mock("../api", () => ({
  api: {
    prds: {
      getPrd: vi.fn(),
      updatePrd: vi.fn(),
      deletePrd: vi.fn(),
      addPrdDocument: vi.fn(),
      deletePrdDocument: vi.fn(),
    },
    epics: {
      listEpics: vi.fn(),
    },
  },
  PrdStatus: {
    Draft: "DRAFT",
    InReview: "IN_REVIEW",
    Approved: "APPROVED",
    Implemented: "IMPLEMENTED",
    Archived: "ARCHIVED",
  },
  PrdDocumentType: {
    Prd: "PRD",
    Wireframe: "WIREFRAME",
    Mockup: "MOCKUP",
    Other: "OTHER",
  },
}));

// Mock Terminal component
vi.mock("../components/Terminal", () => ({
  default: () => <div data-testid="terminal">Terminal</div>,
}));

// Mock TerminalContext
vi.mock("../contexts/TerminalContext", () => ({
  useTerminal: () => ({
    sessions: [],
    activeSessionId: null,
    activeSession: null,
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
    getExistingSession: vi.fn(() => null),
    switchToSession: vi.fn(),
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

// Mock useHasClaudeSession hook
vi.mock("../hooks/useHasClaudeSession", () => ({
  useHasClaudeSession: vi.fn(() => false),
}));

// Create mutable mock state for useLocalProjectPath
const mockLocalProjectPathState = {
  localPath: null as string | null,
};

// Mock useLocalProjectPath hook
vi.mock("../hooks/useLocalProjectPath", () => ({
  useLocalProjectPath: () => ({
    localPath: mockLocalProjectPathState.localPath,
    isConfigured: mockLocalProjectPathState.localPath !== null,
    setLocalPath: vi.fn(),
    getRepoFullPath: vi.fn(),
  }),
}));

// Mock ProjectContext
const mockGetProjectRef = vi.fn(() => "PROJ-1");
vi.mock("../contexts/ProjectContext", () => ({
  useProject: () => ({
    currentProject: { id: "proj_123", name: "Test Project" },
    getProjectRef: mockGetProjectRef,
  }),
}));

// Mock promptGenerator
vi.mock("../services/promptGenerator", () => ({
  generatePrdPrompt: vi.fn(() => "generated prompt"),
}));

const mockNavigate = vi.fn();

// Mock react-router-dom partially
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Import after mocks
import PRDDetailPage from "./PRDDetailPage";
import { api, PrdStatus } from "../api";

// Mock data
const mockPrd = {
  id: "prd_123",
  displayKey: "PRD-1",
  title: "Test PRD",
  description: "Test description",
  projectId: "proj_123",
  status: PrdStatus.Draft,
  createdById: "user_123",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderPage(prdName: string = "PRD-1") {
  return render(
    <MemoryRouter initialEntries={[`/prds/${prdName}`]}>
      <Routes>
        <Route path="/prds/:prdName" element={<PRDDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PRDDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset local path state
    mockLocalProjectPathState.localPath = null;
    // Set up default successful responses
    vi.mocked(api.prds.getPrd).mockResolvedValue(mockPrd as never);
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      data: [],
      pagination: { hasMore: false },
    } as never);
  });

  afterEach(async () => {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe("Project path configuration check", () => {
    it("shows 'Project path not configured' when localPath is null", async () => {
      // localPath is null by default from beforeEach
      mockLocalProjectPathState.localPath = null;

      renderPage();

      await waitFor(() => {
        expect(
          screen.getByText("Project path not configured.")
        ).toBeInTheDocument();
      });

      // Should show back button
      expect(screen.getByText("Back to PRDs")).toBeInTheDocument();
    });

    it("shows 'Project path not configured' when localPath is empty string", async () => {
      // Test edge case of empty string (should be treated as not configured)
      mockLocalProjectPathState.localPath = "";

      renderPage();

      await waitFor(() => {
        expect(
          screen.getByText("Project path not configured.")
        ).toBeInTheDocument();
      });
    });

    it("proceeds to load PRD when localPath is configured", async () => {
      mockLocalProjectPathState.localPath = "/Users/test/project";

      renderPage();

      // Should show loading state first, then PRD content
      await waitFor(() => {
        expect(api.prds.getPrd).toHaveBeenCalledWith({
          projectRef: "PROJ-1",
          prdRef: "PRD-1",
        });
      });
    });

  });

  describe("Back button navigation", () => {
    it("navigates back when back button is clicked on unconfigured path screen", async () => {
      mockLocalProjectPathState.localPath = null;

      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Back to PRDs")).toBeInTheDocument();
      });

      screen.getByText("Back to PRDs").click();

      expect(mockNavigate).toHaveBeenCalledWith("/prds");
    });
  });
});
