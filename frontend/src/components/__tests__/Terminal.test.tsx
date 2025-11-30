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

// Track WebSocket instances and timeouts
const wsInstances: MockWebSocket[] = [];
const pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    wsInstances.push(this);
    // Simulate connection - track timeout for cleanup
    const timeout = setTimeout(() => {
      this.onopen?.();
    }, 10);
    pendingTimeouts.push(timeout);
  }

  send = vi.fn();
  close = vi.fn();
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

import Terminal from "../Terminal";

describe("Terminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wsInstances.length = 0;
    pendingTimeouts.length = 0;
  });

  afterEach(() => {
    // Clear all pending timeouts to prevent cleanup errors
    pendingTimeouts.forEach((t) => clearTimeout(t));
    pendingTimeouts.length = 0;
    wsInstances.length = 0;
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

  it("shows disconnected status initially", () => {
    render(<Terminal taskId={1} />);

    // Status should show disconnected initially (before WebSocket connects)
    expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
  });

  it("creates WebSocket with task ID in URL", () => {
    render(<Terminal taskId={42} />);

    expect(wsInstances.length).toBeGreaterThan(0);
    expect(wsInstances[0]?.url).toContain("/ws/terminal/task/42");
  });

  it("uses custom WebSocket URL when provided", () => {
    const wsUrl = "ws://test.local:3000/ws/terminal/123";
    render(<Terminal taskId={123} wsUrl={wsUrl} />);

    expect(wsInstances[0]?.url).toBe(wsUrl);
  });
});
