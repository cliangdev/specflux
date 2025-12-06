import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock xterm and addons
vi.mock("@xterm/xterm", () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    write: vi.fn(),
    writeln: vi.fn(),
    clear: vi.fn(),
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    onScroll: vi.fn(() => ({ dispose: vi.fn() })),
    scrollToLine: vi.fn(),
    dispose: vi.fn(),
    focus: vi.fn(),
    cols: 80,
    rows: 24,
    buffer: {
      active: {
        baseY: 0,
        viewportY: 0,
      },
    },
  })),
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
  })),
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@xterm/addon-webgl", () => ({
  WebglAddon: vi.fn().mockImplementation(() => ({
    onContextLoss: vi.fn(),
    dispose: vi.fn(),
  })),
}));

vi.mock("@xterm/addon-search", () => ({
  SearchAddon: vi.fn().mockImplementation(() => ({
    findNext: vi.fn(),
    findPrevious: vi.fn(),
  })),
}));

// Mock Tauri terminal service
vi.mock("../../services/tauriTerminal", () => ({
  spawnTerminal: vi.fn().mockResolvedValue(undefined),
  writeToTerminal: vi.fn().mockResolvedValue(undefined),
  resizeTerminal: vi.fn().mockResolvedValue(undefined),
  closeTerminal: vi.fn().mockResolvedValue(undefined),
  hasTerminalSession: vi.fn().mockResolvedValue(false),
  onTerminalOutput: vi.fn().mockResolvedValue(() => {}),
  onTerminalExit: vi.fn().mockResolvedValue(() => {}),
}));

import Terminal from "../Terminal";
import {
  spawnTerminal,
  hasTerminalSession,
} from "../../services/tauriTerminal";

describe("Terminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasTerminalSession).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders terminal container", () => {
    render(<Terminal taskId={1} />);
    expect(screen.getByTestId("terminal")).toBeInTheDocument();
  });

  it("displays terminal header with title", () => {
    render(<Terminal taskId={1} />);
    expect(screen.getByText("Agent Terminal")).toBeInTheDocument();
  });

  it("spawns terminal session with context ID", async () => {
    render(<Terminal contextType="task" contextId={42} />);

    // Wait for async spawn
    await vi.waitFor(() => {
      expect(spawnTerminal).toHaveBeenCalledWith("task-42", undefined);
    });
  });

  it("spawns terminal session with working directory", async () => {
    render(
      <Terminal
        contextType="project"
        contextId="abc123"
        workingDirectory="/home/user/project"
      />,
    );

    await vi.waitFor(() => {
      expect(spawnTerminal).toHaveBeenCalledWith(
        "project-abc123",
        "/home/user/project",
      );
    });
  });

  it("checks for existing session before spawning", async () => {
    vi.mocked(hasTerminalSession).mockResolvedValue(true);

    render(<Terminal contextType="epic" contextId={5} />);

    await vi.waitFor(() => {
      expect(hasTerminalSession).toHaveBeenCalledWith("epic-5");
    });

    // Should not spawn if session already exists
    expect(spawnTerminal).not.toHaveBeenCalled();
  });

  it("supports prd-workshop context type", async () => {
    render(<Terminal contextType="prd-workshop" contextId={1} />);

    await vi.waitFor(() => {
      expect(spawnTerminal).toHaveBeenCalledWith("prd-workshop-1", undefined);
    });
  });
});
