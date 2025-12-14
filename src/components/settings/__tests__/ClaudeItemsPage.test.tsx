import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaudeItemsPage } from "../ClaudeItemsPage";

// Mock Tauri plugin-fs
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
}));

// Mock Tauri path API
vi.mock("@tauri-apps/api/path", () => ({
  join: vi.fn((...parts: string[]) => Promise.resolve(parts.join("/"))),
}));

// Mock ProjectContext
vi.mock("../../../contexts/ProjectContext", () => ({
  useProject: vi.fn(),
}));

// Mock template registry and content
vi.mock("../../../templates/registry", () => ({
  TEMPLATE_REGISTRY: [
    {
      id: "prd",
      sourceFile: "commands/prd.md",
      destPath: ".claude/commands/prd.md",
      description: "/prd - Create or refine product specification",
      category: "command",
    },
    {
      id: "epic",
      sourceFile: "commands/epic.md",
      destPath: ".claude/commands/epic.md",
      description: "/epic - Define or refine an epic",
      category: "command",
    },
    {
      id: "skill-ui-patterns",
      sourceFile: "skills/ui-patterns/SKILL.md",
      destPath: ".claude/skills/ui-patterns/SKILL.md",
      description: "UI design patterns and dark mode support",
      category: "skill",
    },
    {
      id: "mcp-config",
      sourceFile: ".mcp.json",
      destPath: ".claude/.mcp.json",
      description: "MCP server configuration",
      category: "mcp",
    },
  ],
}));

vi.mock("../../../templates/templateContent", () => ({
  getTemplateContent: vi.fn((sourceFile: string) => {
    const contents: Record<string, string> = {
      "commands/prd.md": "# PRD Command\n\nCreate product specs",
      "commands/epic.md": "# Epic Command\n\nDefine epics",
      "skills/ui-patterns/SKILL.md": "# UI Patterns\n\nDesign patterns for UI",
      ".mcp.json": '{ "servers": {} }',
    };
    return contents[sourceFile];
  }),
}));

// Mock MarkdownRenderer
vi.mock("../../ui/MarkdownRenderer", () => ({
  default: ({ source }: { source: string }) => (
    <div data-testid="markdown-renderer">{source}</div>
  ),
}));

import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { useProject } from "../../../contexts/ProjectContext";

const mockReadTextFile = readTextFile as ReturnType<typeof vi.fn>;
const mockWriteTextFile = writeTextFile as ReturnType<typeof vi.fn>;
const mockExists = exists as ReturnType<typeof vi.fn>;
const mockMkdir = mkdir as ReturnType<typeof vi.fn>;
const mockUseProject = useProject as ReturnType<typeof vi.fn>;

describe("ClaudeItemsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProject.mockReturnValue({
      currentProject: {
        id: 1,
        name: "Test Project",
        localPath: "/home/user/projects/test",
      },
    });
    mockWriteTextFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
  });

  describe("no project selected", () => {
    it("shows message when no project is selected", () => {
      mockUseProject.mockReturnValue({ currentProject: null });

      render(<ClaudeItemsPage category="command" />);

      expect(screen.getByText("No project selected")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner while loading", () => {
      mockExists.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { container } = render(<ClaudeItemsPage category="command" />);

      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  describe("commands category", () => {
    it("displays correct title and description for commands", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        expect(screen.getByText("Commands")).toBeInTheDocument();
      });
      expect(
        screen.getByText("Slash commands available in Claude Code for this project.")
      ).toBeInTheDocument();
    });

    it("shows command templates with correct display names", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        expect(screen.getByText("/prd")).toBeInTheDocument();
        expect(screen.getByText("/epic")).toBeInTheDocument();
      });
    });

    it("shows Missing status for non-existent files", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        const missingBadges = screen.getAllByText("Missing");
        expect(missingBadges.length).toBeGreaterThan(0);
      });
    });

    it("shows Synced status when file matches template", async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue("# PRD Command\n\nCreate product specs");

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        expect(screen.getByText("Synced")).toBeInTheDocument();
      });
    });

    it("shows Modified status when file differs from template", async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockResolvedValue("# Modified PRD Command\n\nCustom content");

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        const modifiedBadges = screen.getAllByText("Modified");
        expect(modifiedBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe("skills category", () => {
    it("displays correct title and description for skills", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="skill" />);

      await waitFor(() => {
        expect(screen.getByText("Skills")).toBeInTheDocument();
      });
      expect(
        screen.getByText("Skill files that provide domain-specific knowledge to Claude Code.")
      ).toBeInTheDocument();
    });

    it("shows skill templates with skill- prefix removed", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="skill" />);

      await waitFor(() => {
        expect(screen.getByText("ui-patterns")).toBeInTheDocument();
      });
    });
  });

  describe("mcp category", () => {
    it("displays correct title and description for MCP", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="mcp" />);

      await waitFor(() => {
        expect(screen.getByText("MCP Servers")).toBeInTheDocument();
      });
      expect(
        screen.getByText("Model Context Protocol server configuration.")
      ).toBeInTheDocument();
    });

    it("shows MCP config with .mcp.json display name", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="mcp" />);

      await waitFor(() => {
        expect(screen.getByText(".mcp.json")).toBeInTheDocument();
      });
    });
  });

  describe("card expansion", () => {
    it("expands card to show content when clicked", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        expect(screen.getByText("/prd")).toBeInTheDocument();
      });

      // Click to expand
      const prdButton = screen.getByText("/prd").closest("button");
      fireEvent.click(prdButton!);

      // Should show file path
      expect(screen.getByText(".claude/commands/prd.md")).toBeInTheDocument();

      // Should show content via MarkdownRenderer
      expect(screen.getByTestId("markdown-renderer")).toBeInTheDocument();
    });

    it("collapses card when clicked again", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        expect(screen.getByText("/prd")).toBeInTheDocument();
      });

      const prdButton = screen.getByText("/prd").closest("button");

      // Expand
      fireEvent.click(prdButton!);
      expect(screen.getByText(".claude/commands/prd.md")).toBeInTheDocument();

      // Collapse
      fireEvent.click(prdButton!);
      expect(screen.queryByText(".claude/commands/prd.md")).not.toBeInTheDocument();
    });
  });

  describe("sync functionality", () => {
    it("shows Sync button for missing templates", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        const syncButtons = screen.getAllByText("Sync");
        expect(syncButtons.length).toBeGreaterThan(0);
      });
    });

    it("hides Sync button for synced templates", async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockImplementation((path: string) => {
        if (path.includes("prd")) return Promise.resolve("# PRD Command\n\nCreate product specs");
        if (path.includes("epic")) return Promise.resolve("# Epic Command\n\nDefine epics");
        return Promise.resolve("");
      });

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        expect(screen.getAllByText("Synced").length).toBe(2);
      });

      // Should not have individual Sync buttons when all are synced
      const syncButtons = screen.queryAllByRole("button", { name: "Sync" });
      expect(syncButtons.length).toBe(0);
    });

    it("syncs template when Sync button is clicked", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        expect(screen.getByText("/prd")).toBeInTheDocument();
      });

      const syncButtons = screen.getAllByText("Sync");
      fireEvent.click(syncButtons[0]);

      await waitFor(() => {
        expect(mockWriteTextFile).toHaveBeenCalled();
      });
    });

    it("shows Sync All button with count of unsynced items", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        expect(screen.getByText("Sync All (2)")).toBeInTheDocument();
      });
    });

    it("disables Sync All when all templates are synced", async () => {
      mockExists.mockResolvedValue(true);
      mockReadTextFile.mockImplementation((path: string) => {
        if (path.includes("prd")) return Promise.resolve("# PRD Command\n\nCreate product specs");
        if (path.includes("epic")) return Promise.resolve("# Epic Command\n\nDefine epics");
        return Promise.resolve("");
      });

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        const syncAllButton = screen.getByText("Sync All");
        expect(syncAllButton).toBeDisabled();
      });
    });

    it("syncs all templates when Sync All is clicked", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        expect(screen.getByText("Sync All (2)")).toBeInTheDocument();
      });

      const syncAllButton = screen.getByText("Sync All (2)");
      fireEvent.click(syncAllButton);

      await waitFor(() => {
        expect(mockWriteTextFile).toHaveBeenCalledTimes(2);
      });
    });

    it("creates parent directory if it does not exist", async () => {
      mockExists.mockImplementation((path: string) => {
        if (path.includes(".claude/commands")) return Promise.resolve(false);
        return Promise.resolve(false);
      });

      render(<ClaudeItemsPage category="command" />);

      await waitFor(() => {
        expect(screen.getByText("/prd")).toBeInTheDocument();
      });

      const syncButtons = screen.getAllByText("Sync");
      fireEvent.click(syncButtons[0]);

      await waitFor(() => {
        expect(mockMkdir).toHaveBeenCalledWith(
          expect.stringContaining(".claude/commands"),
          { recursive: true }
        );
      });
    });
  });

  describe("JSON file rendering", () => {
    it("renders JSON files as preformatted text", async () => {
      mockExists.mockResolvedValue(false);

      render(<ClaudeItemsPage category="mcp" />);

      await waitFor(() => {
        expect(screen.getByText(".mcp.json")).toBeInTheDocument();
      });

      // Expand the card
      const mcpButton = screen.getByText(".mcp.json").closest("button");
      fireEvent.click(mcpButton!);

      // Should show JSON content in a pre element, not markdown
      await waitFor(() => {
        const preElement = screen.getByText('{ "servers": {} }');
        expect(preElement.tagName).toBe("PRE");
      });
    });
  });
});
