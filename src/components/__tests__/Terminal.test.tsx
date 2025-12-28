import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

global.ResizeObserver = class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as unknown as typeof ResizeObserver;

vi.mock("@xterm/xterm", () => ({
  Terminal: class MockTerminal {
    loadAddon = vi.fn();
    open = vi.fn();
    write = vi.fn();
    writeln = vi.fn();
    clear = vi.fn();
    onData = vi.fn(() => ({ dispose: vi.fn() }));
    onScroll = vi.fn(() => ({ dispose: vi.fn() }));
    scrollToLine = vi.fn();
    dispose = vi.fn();
    focus = vi.fn();
    cols = 80;
    rows = 24;
    buffer = {
      active: {
        baseY: 0,
        viewportY: 0,
      },
    };
  },
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class MockFitAddon {
    fit = vi.fn();
  },
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: class MockWebLinksAddon {},
}));

vi.mock("@xterm/addon-webgl", () => ({
  WebglAddon: class MockWebglAddon {
    onContextLoss = vi.fn();
    dispose = vi.fn();
  },
}));

vi.mock("@xterm/addon-search", () => ({
  SearchAddon: class MockSearchAddon {
    findNext = vi.fn();
    findPrevious = vi.fn();
  },
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

// Mock environment module
vi.mock("../../lib/environment", () => ({
  getApiBaseUrl: vi.fn().mockReturnValue("http://localhost:8090"),
}));

// Mock Claude session services
vi.mock("../../services/claudeSessionStore", () => ({
  getClaudeSessionId: vi.fn().mockResolvedValue(null),
  buildContextKey: vi.fn((type, id) => `${type}:${id}`),
  removeClaudeSessionId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/claudeSessionDetector", () => ({
  pollForClaudeSession: vi.fn(),
  snapshotExistingSessions: vi.fn().mockResolvedValue(new Set()),
  sessionExists: vi.fn().mockResolvedValue(true),
}));

import Terminal from "../Terminal";
import {
  spawnTerminal,
  hasTerminalSession,
  writeToTerminal,
} from "../../services/tauriTerminal";
import {
  getClaudeSessionId,
  removeClaudeSessionId,
} from "../../services/claudeSessionStore";
import {
  pollForClaudeSession,
  sessionExists,
} from "../../services/claudeSessionDetector";

describe("Terminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Tauri terminal mocks
    vi.mocked(hasTerminalSession).mockResolvedValue(false);
    vi.mocked(spawnTerminal).mockResolvedValue(undefined);
    vi.mocked(writeToTerminal).mockResolvedValue(undefined);
    // Reset Claude session mocks
    vi.mocked(getClaudeSessionId).mockResolvedValue(null);
    vi.mocked(removeClaudeSessionId).mockResolvedValue(undefined);
    vi.mocked(pollForClaudeSession).mockResolvedValue(undefined);
    vi.mocked(sessionExists).mockResolvedValue(true);
  });

  it("renders terminal container", () => {
    render(<Terminal contextType="task" contextId="task_123" />);
    expect(screen.getByTestId("terminal")).toBeInTheDocument();
  });

  it("renders terminal wrapper element", () => {
    const { container } = render(<Terminal contextType="task" contextId="task_123" />);
    // Terminal component now renders just the terminal wrapper (header is in TerminalPanel)
    expect(container.querySelector(".terminal-wrapper")).toBeInTheDocument();
  });

  it("spawns terminal session with context type", async () => {
    render(<Terminal contextType="task" contextId="task_42" />);

    // Wait for async spawn
    await vi.waitFor(() => {
      expect(spawnTerminal).toHaveBeenCalledWith("task-task_42", undefined, {
        SPECFLUX_API_URL: "http://localhost:8090",
        SPECFLUX_CONTEXT_TYPE: "task",
        SPECFLUX_CONTEXT_ID: "task_42",
      });
    });
  });

  it("spawns terminal session with working directory", async () => {
    render(
      <Terminal
        contextType="project"
        contextId="proj_abc123"
        workingDirectory="/home/user/project"
      />,
    );

    await vi.waitFor(() => {
      expect(spawnTerminal).toHaveBeenCalledWith(
        "project-proj_abc123",
        "/home/user/project",
        {
          SPECFLUX_API_URL: "http://localhost:8090",
          SPECFLUX_CONTEXT_TYPE: "project",
          SPECFLUX_CONTEXT_ID: "proj_abc123",
        },
      );
    });
  });

  it("checks for existing session before spawning", async () => {
    vi.mocked(hasTerminalSession).mockResolvedValue(true);

    render(<Terminal contextType="epic" contextId="epic_5" />);

    await vi.waitFor(() => {
      expect(hasTerminalSession).toHaveBeenCalledWith("epic-epic_5");
    });

    // Should not spawn if session already exists
    expect(spawnTerminal).not.toHaveBeenCalled();
  });

  it("supports prd-workshop context type", async () => {
    render(<Terminal contextType="prd-workshop" contextId="prd_1" />);

    await vi.waitFor(() => {
      expect(spawnTerminal).toHaveBeenCalledWith("prd-workshop-prd_1", undefined, {
        SPECFLUX_API_URL: "http://localhost:8090",
        SPECFLUX_CONTEXT_TYPE: "prd-workshop",
        SPECFLUX_CONTEXT_ID: "prd_1",
      });
    });
  });

  it("includes all context environment variables when contextDisplayKey is provided", async () => {
    render(
      <Terminal
        contextType="task"
        contextId="task_42"
        contextDisplayKey="SPEC-T42"
        projectRef="SPEC"
      />,
    );

    await vi.waitFor(() => {
      expect(spawnTerminal).toHaveBeenCalledWith(
        "task-task_42",
        undefined,
        expect.objectContaining({
          SPECFLUX_PROJECT_REF: "SPEC",
          SPECFLUX_CONTEXT_TYPE: "task",
          SPECFLUX_CONTEXT_ID: "task_42",
          SPECFLUX_CONTEXT_REF: "SPEC-T42",
          SPECFLUX_CONTEXT_DISPLAY_KEY: "SPEC-T42",
        }),
      );
    });
  });

  it("sends initial command for new sessions", async () => {
    vi.useFakeTimers();

    render(
      <Terminal
        contextType="task"
        contextId="task_1"
        initialCommand="claude"
      />,
    );

    // Wait for spawn
    await vi.waitFor(() => {
      expect(spawnTerminal).toHaveBeenCalled();
    });

    // Advance timer for initial command delay (500ms)
    await vi.advanceTimersByTimeAsync(600);

    expect(writeToTerminal).toHaveBeenCalledWith("task-task_1", "claude\n");

    vi.useRealTimers();
  });

  it("sends initial prompt after initial command for new sessions", async () => {
    vi.useFakeTimers();

    render(
      <Terminal
        contextType="prd"
        contextId="prd_1"
        initialCommand="claude"
        initialPrompt="Help me with this PRD"
      />,
    );

    // Wait for spawn
    await vi.waitFor(() => {
      expect(spawnTerminal).toHaveBeenCalled();
    });

    // Advance timer for initial command delay (500ms)
    await vi.advanceTimersByTimeAsync(600);
    expect(writeToTerminal).toHaveBeenCalledWith("prd-prd_1", "claude\n");

    // Advance timer for prompt delay (8000ms total from start)
    await vi.advanceTimersByTimeAsync(8000);

    // Should send prompt text
    expect(writeToTerminal).toHaveBeenCalledWith("prd-prd_1", "Help me with this PRD");

    // Advance for Enter key (100ms after prompt)
    await vi.advanceTimersByTimeAsync(200);
    expect(writeToTerminal).toHaveBeenCalledWith("prd-prd_1", "\r");

    vi.useRealTimers();
  });

  it("does not send initial command/prompt for existing sessions", async () => {
    vi.useFakeTimers();
    vi.mocked(hasTerminalSession).mockResolvedValue(true);

    render(
      <Terminal
        contextType="task"
        contextId="task_existing"
        initialCommand="claude"
        initialPrompt="Help me"
      />,
    );

    // Wait for session check
    await vi.waitFor(() => {
      expect(hasTerminalSession).toHaveBeenCalledWith("task-task_existing");
    });

    // Should not spawn new terminal
    expect(spawnTerminal).not.toHaveBeenCalled();

    // Advance all timers
    await vi.advanceTimersByTimeAsync(10000);

    // Should not send any commands/prompts for existing sessions
    expect(writeToTerminal).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  describe("Agent Launch Behaviors", () => {
    describe("Launch New Agent (no existing Claude session)", () => {
      it("sends plain 'claude' command without --resume", async () => {
        vi.useFakeTimers();
        // No stored Claude session
        vi.mocked(getClaudeSessionId).mockResolvedValue(null);

        render(
          <Terminal
            contextType="task"
            contextId="task_new"
            workingDirectory="/path/to/project"
            initialCommand="claude"
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Advance timer for initial command delay (500ms)
        await vi.advanceTimersByTimeAsync(600);

        // Should send plain 'claude' without --resume
        expect(writeToTerminal).toHaveBeenCalledWith("task-task_new", "claude\n");

        vi.useRealTimers();
      });

      it("sends initialPrompt after Claude starts", async () => {
        vi.useFakeTimers();
        vi.mocked(getClaudeSessionId).mockResolvedValue(null);

        render(
          <Terminal
            contextType="task"
            contextId="task_prompt"
            workingDirectory="/path/to/project"
            initialCommand="claude"
            initialPrompt="Help me with this task"
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Advance timer for initial command delay (500ms)
        await vi.advanceTimersByTimeAsync(600);
        expect(writeToTerminal).toHaveBeenCalledWith("task-task_prompt", "claude\n");

        // Advance timer for prompt delay (8000ms total)
        await vi.advanceTimersByTimeAsync(8000);

        // Should send prompt text
        expect(writeToTerminal).toHaveBeenCalledWith("task-task_prompt", "Help me with this task");

        // Advance for Enter key (100ms after prompt)
        await vi.advanceTimersByTimeAsync(200);
        expect(writeToTerminal).toHaveBeenCalledWith("task-task_prompt", "\r");

        vi.useRealTimers();
      });

      it("polls for new Claude session ID", async () => {
        vi.useFakeTimers();
        vi.mocked(getClaudeSessionId).mockResolvedValue(null);

        render(
          <Terminal
            contextType="task"
            contextId="task_poll"
            workingDirectory="/path/to/project"
            initialCommand="claude"
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Advance timer for initial command delay
        await vi.advanceTimersByTimeAsync(600);

        expect(pollForClaudeSession).toHaveBeenCalledWith(
          "/path/to/project",
          "task:task_poll",
          expect.any(Set),
          expect.any(Date),
        );

        vi.useRealTimers();
      });
    });

    describe("Resume Existing Agent", () => {
      it("sends 'claude --resume <sessionId>' command when session exists", async () => {
        vi.useFakeTimers();
        // Stored Claude session exists
        vi.mocked(getClaudeSessionId).mockResolvedValue("abc123-session-id");
        vi.mocked(sessionExists).mockResolvedValue(true);

        render(
          <Terminal
            contextType="task"
            contextId="task_resume"
            workingDirectory="/path/to/project"
            initialCommand="claude"
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Advance timer for initial command delay
        await vi.advanceTimersByTimeAsync(600);

        // Should send claude --resume command
        expect(writeToTerminal).toHaveBeenCalledWith(
          "task-task_resume",
          "claude --resume abc123-session-id\n"
        );

        vi.useRealTimers();
      });

      it("does NOT send initialPrompt when resuming", async () => {
        vi.useFakeTimers();
        vi.mocked(getClaudeSessionId).mockResolvedValue("existing-session");
        vi.mocked(sessionExists).mockResolvedValue(true);

        render(
          <Terminal
            contextType="task"
            contextId="task_resume_no_prompt"
            workingDirectory="/path/to/project"
            initialCommand="claude"
            initialPrompt="This should NOT be sent"
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Advance all timers to cover prompt timing
        await vi.advanceTimersByTimeAsync(15000);

        // Get all writeToTerminal calls
        const calls = vi.mocked(writeToTerminal).mock.calls;

        // Should only have the resume command, not the prompt
        expect(calls).toContainEqual(["task-task_resume_no_prompt", "claude --resume existing-session\n"]);
        // Should NOT contain the prompt
        expect(calls).not.toContainEqual(["task-task_resume_no_prompt", "This should NOT be sent"]);

        vi.useRealTimers();
      });

      it("does NOT poll for new session when resuming", async () => {
        vi.useFakeTimers();
        vi.mocked(getClaudeSessionId).mockResolvedValue("existing-session");
        vi.mocked(sessionExists).mockResolvedValue(true);

        render(
          <Terminal
            contextType="task"
            contextId="task_no_poll"
            workingDirectory="/path/to/project"
            initialCommand="claude"
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Advance timer for initial command delay
        await vi.advanceTimersByTimeAsync(600);

        // Should NOT poll for new session when resuming
        expect(pollForClaudeSession).not.toHaveBeenCalled();

        vi.useRealTimers();
      });

      it("validates session exists before resuming", async () => {
        vi.useFakeTimers();
        // Session ID stored but session no longer exists
        vi.mocked(getClaudeSessionId).mockResolvedValue("stale-session");
        vi.mocked(sessionExists).mockResolvedValue(false);

        render(
          <Terminal
            contextType="task"
            contextId="task_stale"
            workingDirectory="/path/to/project"
            initialCommand="claude"
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Advance timer for initial command delay
        await vi.advanceTimersByTimeAsync(600);

        // Should fall back to fresh start (no --resume)
        expect(writeToTerminal).toHaveBeenCalledWith("task-task_stale", "claude\n");

        // Should clear the stale session ID
        expect(removeClaudeSessionId).toHaveBeenCalledWith(
          "/path/to/project",
          "task:task_stale"
        );

        vi.useRealTimers();
      });
    });

    describe("Force Launch New Agent (forceNew=true)", () => {
      it("clears stored session ID when forceNew is true", async () => {
        vi.useFakeTimers();
        // Even with stored session, forceNew should clear it
        vi.mocked(getClaudeSessionId).mockResolvedValue("existing-session");

        render(
          <Terminal
            contextType="task"
            contextId="task_force"
            workingDirectory="/path/to/project"
            initialCommand="claude"
            forceNew={true}
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Should clear the session ID
        expect(removeClaudeSessionId).toHaveBeenCalledWith(
          "/path/to/project",
          "task:task_force"
        );

        vi.useRealTimers();
      });

      it("sends plain 'claude' command even if session existed", async () => {
        vi.useFakeTimers();
        vi.mocked(getClaudeSessionId).mockResolvedValue("ignored-session");

        render(
          <Terminal
            contextType="task"
            contextId="task_force_cmd"
            workingDirectory="/path/to/project"
            initialCommand="claude"
            forceNew={true}
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Advance timer for initial command delay
        await vi.advanceTimersByTimeAsync(600);

        // Should send plain 'claude' without --resume
        expect(writeToTerminal).toHaveBeenCalledWith("task-task_force_cmd", "claude\n");

        vi.useRealTimers();
      });

      it("sends initialPrompt like a fresh start when forceNew", async () => {
        vi.useFakeTimers();
        vi.mocked(getClaudeSessionId).mockResolvedValue("ignored-session");

        render(
          <Terminal
            contextType="task"
            contextId="task_force_prompt"
            workingDirectory="/path/to/project"
            initialCommand="claude"
            initialPrompt="Fresh prompt for new agent"
            forceNew={true}
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Advance timer for command delay
        await vi.advanceTimersByTimeAsync(600);
        expect(writeToTerminal).toHaveBeenCalledWith("task-task_force_prompt", "claude\n");

        // Advance timer for prompt delay
        await vi.advanceTimersByTimeAsync(8000);

        // Should send the prompt
        expect(writeToTerminal).toHaveBeenCalledWith(
          "task-task_force_prompt",
          "Fresh prompt for new agent"
        );

        vi.useRealTimers();
      });

      it("polls for new Claude session when forceNew", async () => {
        vi.useFakeTimers();
        vi.mocked(getClaudeSessionId).mockResolvedValue("ignored-session");

        render(
          <Terminal
            contextType="task"
            contextId="task_force_poll"
            workingDirectory="/path/to/project"
            initialCommand="claude"
            forceNew={true}
          />,
        );

        // Wait for spawn
        await vi.waitFor(() => {
          expect(spawnTerminal).toHaveBeenCalled();
        });

        // Advance timer for initial command delay
        await vi.advanceTimersByTimeAsync(600);

        expect(pollForClaudeSession).toHaveBeenCalledWith(
          "/path/to/project",
          "task:task_force_poll",
          expect.any(Set),
          expect.any(Date),
        );

        vi.useRealTimers();
      });
    });
  });
});
