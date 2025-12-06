import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServerSettings, parseMcpConfig } from "../McpServerSettings";

// Mock Tauri plugin-fs
vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
}));

// Mock ProjectContext
vi.mock("../../../contexts/ProjectContext", () => ({
  useProject: vi.fn(),
}));

import { readTextFile } from "@tauri-apps/plugin-fs";
import { useProject } from "../../../contexts/ProjectContext";

const mockReadTextFile = readTextFile as ReturnType<typeof vi.fn>;
const mockUseProject = useProject as ReturnType<typeof vi.fn>;

describe("parseMcpConfig", () => {
  it("parses valid mcp.json with multiple servers", () => {
    const content = JSON.stringify({
      mcpServers: {
        github: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-github"],
          env: { GITHUB_TOKEN: "token123" },
        },
        filesystem: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
        },
      },
    });

    const result = parseMcpConfig(content);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "github",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      envVars: { GITHUB_TOKEN: "token123" },
    });
    expect(result[1]).toEqual({
      name: "filesystem",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
      envVars: {},
    });
  });

  it("handles empty mcpServers object", () => {
    const content = JSON.stringify({ mcpServers: {} });
    expect(parseMcpConfig(content)).toEqual([]);
  });

  it("handles missing mcpServers key", () => {
    const content = JSON.stringify({ otherKey: "value" });
    expect(parseMcpConfig(content)).toEqual([]);
  });

  it("handles missing optional fields", () => {
    const content = JSON.stringify({
      mcpServers: {
        minimal: {},
      },
    });

    const result = parseMcpConfig(content);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "minimal",
      command: "",
      args: [],
      envVars: {},
    });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseMcpConfig("not json")).toThrow();
  });
});

describe("McpServerSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProject.mockReturnValue({
      currentProject: {
        id: 1,
        name: "Test Project",
        localPath: "/home/user/projects/test",
      },
    });
  });

  it("shows loading state initially", () => {
    mockReadTextFile.mockImplementation(() => new Promise(() => {}));

    render(<McpServerSettings />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows no project selected when currentProject is null", () => {
    mockUseProject.mockReturnValue({ currentProject: null });

    render(<McpServerSettings />);

    expect(screen.getByText("No project selected")).toBeInTheDocument();
  });

  it("shows empty state when file doesn't exist", async () => {
    mockReadTextFile.mockRejectedValue(new Error("File not found"));

    render(<McpServerSettings />);

    await waitFor(() => {
      expect(screen.getByText("No MCP servers found")).toBeInTheDocument();
    });
  });

  it("displays MCP servers from .mcp.json", async () => {
    mockReadTextFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: {
          github: {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-github"],
            env: { GITHUB_TOKEN: "token" },
          },
          playwright: {
            command: "npx",
            args: ["-y", "@playwright/mcp"],
          },
        },
      }),
    );

    render(<McpServerSettings />);

    await waitFor(() => {
      expect(screen.getByText("github")).toBeInTheDocument();
      expect(screen.getByText("playwright")).toBeInTheDocument();
    });

    // Check command display
    expect(
      screen.getByText("npx -y @modelcontextprotocol/server-github"),
    ).toBeInTheDocument();
  });

  it("displays environment variable badges", async () => {
    mockReadTextFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: {
          server: {
            command: "cmd",
            env: {
              VAR1: "value1",
              VAR2: "value2",
            },
          },
        },
      }),
    );

    render(<McpServerSettings />);

    await waitFor(() => {
      expect(screen.getByText("VAR1")).toBeInTheDocument();
      expect(screen.getByText("VAR2")).toBeInTheDocument();
    });
  });

  it("truncates env vars when more than 3", async () => {
    mockReadTextFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: {
          server: {
            command: "cmd",
            env: {
              VAR1: "1",
              VAR2: "2",
              VAR3: "3",
              VAR4: "4",
              VAR5: "5",
            },
          },
        },
      }),
    );

    render(<McpServerSettings />);

    await waitFor(() => {
      expect(screen.getByText("+2 more")).toBeInTheDocument();
    });
  });

  it("reads from correct path", async () => {
    mockReadTextFile.mockResolvedValue(JSON.stringify({ mcpServers: {} }));

    render(<McpServerSettings />);

    await waitFor(() => {
      expect(mockReadTextFile).toHaveBeenCalledWith(
        "/home/user/projects/test/.claude/.mcp.json",
      );
    });
  });
});
