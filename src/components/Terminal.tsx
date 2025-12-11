import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import {
  spawnTerminal,
  writeToTerminal,
  resizeTerminal as resizeTerminalIpc,
  closeTerminal,
  onTerminalOutput,
  onTerminalExit,
  hasTerminalSession,
} from "../services/tauriTerminal";

interface FileChangeEvent {
  action: "created" | "modified" | "deleted";
  filePath: string;
}

interface TerminalDimensions {
  cols: number;
  rows: number;
}

type ContextType = "task" | "epic" | "project" | "prd-workshop" | "release";

interface TerminalProps {
  contextType?: ContextType;
  contextId?: string;
  contextDisplayKey?: string; // Human-readable key like "SPEC-P1" or "SPEC-T42"
  projectRef?: string; // Project reference for API calls
  workingDirectory?: string; // Working directory for the terminal
  initialCommand?: string; // Command to run after terminal starts (e.g., "claude")
  onStatusChange?: (running: boolean) => void;
  onConnectionChange?: (connected: boolean) => void;
  onExit?: (exitCode: number) => void;
  onRefresh?: () => void;
  onFileChange?: (event: FileChangeEvent) => void;
  onProgress?: (progress: number) => void;
  onDimensionsReady?: (dimensions: TerminalDimensions) => void;
}

/**
 * Terminal - Optimized terminal component with WebGL rendering
 *
 * Features:
 * - Native PTY via Tauri IPC (no WebSocket required)
 * - WebGL renderer for 3-5x better performance (with canvas fallback)
 * - Scrollback buffer (10,000 lines) for session recovery
 * - Simplified mouse handling via xterm options
 */
export function Terminal({
  contextType = "task",
  contextId,
  contextDisplayKey,
  projectRef,
  workingDirectory,
  initialCommand,
  onStatusChange,
  onConnectionChange,
  onExit,
  onRefresh,
  onFileChange,
  onProgress,
  onDimensionsReady,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const webglAddonRef = useRef<WebglAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Track if user has scrolled away from the bottom (to disable auto-scroll)
  const userScrolledRef = useRef(false);

  // Session ID for Tauri IPC
  const sessionId = `${contextType}-${contextId}`;

  // Track if initial command has been sent (only send once per session)
  const initialCommandSentRef = useRef(false);

  // Use refs for context values so connect() uses latest values
  const contextDisplayKeyRef = useRef(contextDisplayKey);
  const projectRefRef = useRef(projectRef);

  // Keep context refs in sync
  useEffect(() => {
    contextDisplayKeyRef.current = contextDisplayKey;
  }, [contextDisplayKey]);
  useEffect(() => {
    projectRefRef.current = projectRef;
  }, [projectRef]);

  // Use refs for callbacks to avoid reconnection loops
  const runningRef = useRef(running);
  const onStatusChangeRef = useRef(onStatusChange);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onExitRef = useRef(onExit);
  const onFileChangeRef = useRef(onFileChange);
  const onProgressRef = useRef(onProgress);
  const onDimensionsReadyRef = useRef(onDimensionsReady);

  // Keep refs in sync
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);
  useEffect(() => {
    onFileChangeRef.current = onFileChange;
  }, [onFileChange]);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);
  useEffect(() => {
    onDimensionsReadyRef.current = onDimensionsReady;
  }, [onDimensionsReady]);

  // Initialize terminal with WebGL
  useEffect(() => {
    if (!terminalRef.current) return;

    // Performance-optimized terminal configuration (from research)
    const term = new XTerm({
      cursorBlink: false,
      cursorStyle: "bar",
      cursorInactiveStyle: "none",
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
      // Enable scrollback for session recovery (research recommends 10,000)
      scrollback: 10000,
      // Disable transparency for better performance
      allowTransparency: false,
      // Disable mouse reporting to prevent interference with Claude Code menus
      // This is cleaner than filtering sequences
      allowProposedApi: true,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "transparent",
        selectionBackground: "#264f78",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#ffffff",
      },
    });

    // Add FitAddon first
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Add WebLinksAddon for clickable links
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(webLinksAddon);

    // Add SearchAddon for Cmd+F search
    const searchAddon = new SearchAddon();
    term.loadAddon(searchAddon);
    searchAddonRef.current = searchAddon;

    // Open terminal in container
    term.open(terminalRef.current);
    fitAddon.fit();

    // Try to load WebGL addon (falls back to canvas if not supported)
    let webglAddon: WebglAddon | null = null;
    try {
      webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        // WebGL context lost - dispose and fall back to canvas
        console.warn("WebGL context lost, falling back to canvas renderer");
        webglAddon?.dispose();
        webglAddonRef.current = null;
      });
      term.loadAddon(webglAddon);
      webglAddonRef.current = webglAddon;
    } catch (e) {
      console.warn("WebGL not available, using canvas renderer:", e);
    }

    // Notify parent of terminal dimensions
    onDimensionsReadyRef.current?.({ cols: term.cols, rows: term.rows });

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Track user scroll to disable auto-scroll when user scrolls up
    // Reset userScrolledRef when component mounts
    userScrolledRef.current = false;

    const scrollHandler = term.onScroll(() => {
      // Check if user is at the bottom of the terminal
      // buffer.baseY is the number of lines scrolled back (0 = at bottom)
      // buffer.viewportY is the current viewport position
      const buffer = term.buffer.active;
      const isAtBottom = buffer.baseY === buffer.viewportY;
      userScrolledRef.current = !isAtBottom;
    });

    // Handle resize - use ResizeObserver for container size changes
    const handleResize = () => {
      // Use requestAnimationFrame to batch resize operations
      requestAnimationFrame(() => {
        if (!terminalRef.current || !fitAddon) return;
        try {
          // Preserve scroll position before fit
          const buffer = term.buffer.active;
          const wasAtBottom = buffer.baseY === buffer.viewportY;
          const viewportY = buffer.viewportY;

          fitAddon.fit();

          // Restore scroll position after fit (unless user was at bottom)
          if (!wasAtBottom && !userScrolledRef.current) {
            // User was scrolled up - try to restore their position
            term.scrollToLine(viewportY);
          } else if (userScrolledRef.current) {
            // User has explicitly scrolled - maintain their scroll position
            term.scrollToLine(viewportY);
          }
          // If user was at bottom, let xterm.js handle it naturally

          onDimensionsReadyRef.current?.({ cols: term.cols, rows: term.rows });
          // Send resize to Tauri backend
          resizeTerminalIpc(sessionId, term.cols, term.rows).catch((e) =>
            console.error("Failed to resize terminal:", e),
          );
        } catch (e) {
          console.warn("Resize errors during component unmount:", e);
        }
      });
    };

    // Use ResizeObserver to detect container size changes (e.g., panel resizing)
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalRef.current);

    // Also listen to window resize as a fallback
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      scrollHandler.dispose();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      webglAddon?.dispose();
      term.dispose();
    };
  }, [contextType, contextId]);

  // Connect via Tauri IPC
  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !contextId) return;

    let cancelled = false;
    let outputUnlisten: (() => void) | undefined;
    let exitUnlisten: (() => void) | undefined;
    let inputDisposer: { dispose: () => void } | undefined;

    const connect = async () => {
      try {
        // Check if session already exists (reconnecting)
        const exists = await hasTerminalSession(sessionId);

        // Check if effect was cancelled during async operation (React Strict Mode)
        if (cancelled) return;

        if (!exists) {
          // Wait a tick for refs to be updated with latest prop values
          // This handles the case where props update after initial render
          await new Promise((resolve) => setTimeout(resolve, 0));
          if (cancelled) return;


          // Build environment variables with context for Claude
          const env: Record<string, string> = {};
          if (projectRefRef.current) {
            env.SPECFLUX_PROJECT_REF = projectRefRef.current;
          }
          if (contextId) {
            env.SPECFLUX_CONTEXT_TYPE = contextType;
            env.SPECFLUX_CONTEXT_ID = contextId;
          }
          if (contextDisplayKeyRef.current) {
            env.SPECFLUX_CONTEXT_REF = contextDisplayKeyRef.current;
            env.SPECFLUX_CONTEXT_DISPLAY_KEY = contextDisplayKeyRef.current;
          }

          // Spawn new terminal session with context
          await spawnTerminal(
            sessionId,
            workingDirectory,
            Object.keys(env).length > 0 ? env : undefined,
          );
        }

        // Check again after spawn
        if (cancelled) return;

        setConnected(true);
        setRunning(true);
        onConnectionChangeRef.current?.(true);
        onStatusChangeRef.current?.(true);

        // Send initial resize
        await resizeTerminalIpc(sessionId, term.cols, term.rows);

        // Send initial command if provided and not already sent
        if (initialCommand && !initialCommandSentRef.current) {
          initialCommandSentRef.current = true;
          // Small delay to let the shell initialize before sending command
          setTimeout(async () => {
            if (!cancelled) {
              await writeToTerminal(sessionId, initialCommand + "\n");
            }
          }, 500);
        }

        // Listen for terminal output
        outputUnlisten = await onTerminalOutput((event) => {
          if (event.sessionId === sessionId) {
            // Preserve scroll position if user has scrolled away from bottom
            const buffer = term.buffer.active;
            const wasScrolledUp = userScrolledRef.current;
            const viewportY = buffer.viewportY;

            // Write data - convert number array to Uint8Array
            const data = new Uint8Array(event.data);
            term.write(data);

            // If user had scrolled up, restore their position
            if (wasScrolledUp) {
              term.scrollToLine(viewportY);
            }
          }
        });

        // Listen for terminal exit
        exitUnlisten = await onTerminalExit((event) => {
          if (event.sessionId === sessionId) {
            setRunning(false);
            onStatusChangeRef.current?.(false);
            term.writeln("");
            if (event.exitCode === 0) {
              term.writeln("\x1b[32mTerminal session ended.\x1b[0m");
            } else {
              term.writeln(
                `\x1b[31mTerminal exited with code ${event.exitCode}\x1b[0m`,
              );
            }
            onExitRef.current?.(event.exitCode ?? 1);
          }
        });

        // Handle terminal input
        inputDisposer = term.onData((data) => {
          if (runningRef.current) {
            // Filter mouse sequences (SGR, X10, focus events)
            const filtered = data
              .replace(/\x1b\[<\d+;\d+;\d+[Mm]/g, "")
              .replace(/\x1b\[M[\x00-\xff]{3}/g, "")
              .replace(/\x1b\[[IO]/g, "");

            if (filtered) {
              writeToTerminal(sessionId, filtered).catch((e) =>
                console.error("Failed to write to terminal:", e),
              );
            }
          }
        });
      } catch (error) {
        console.error("Failed to connect terminal:", error);
        setConnected(false);
        setRunning(false);
        onConnectionChangeRef.current?.(false);
        term.writeln(`\x1b[31mFailed to start terminal: ${error}\x1b[0m`);
      }
    };

    connect();

    return () => {
      cancelled = true;
      inputDisposer?.dispose();
      outputUnlisten?.();
      exitUnlisten?.();
      // Close terminal session on unmount
      closeTerminal(sessionId).catch((e) =>
        console.error("Failed to close terminal:", e),
      );
    };
  }, [sessionId, contextId, workingDirectory]);

  // Clear scrollback buffer (useful for long sessions)
  const clearBuffer = useCallback(() => {
    xtermRef.current?.clear();
  }, []);

  // Search functions
  const openSearch = useCallback(() => {
    setShowSearch(true);
    // Focus the input after a brief delay to ensure it's rendered
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery("");
    xtermRef.current?.focus();
  }, []);

  const findNext = useCallback(() => {
    if (searchQuery && searchAddonRef.current) {
      searchAddonRef.current.findNext(searchQuery);
    }
  }, [searchQuery]);

  const findPrevious = useCallback(() => {
    if (searchQuery && searchAddonRef.current) {
      searchAddonRef.current.findPrevious(searchQuery);
    }
  }, [searchQuery]);

  // Handle search input key events
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          findPrevious();
        } else {
          findNext();
        }
      } else if (e.key === "Escape") {
        closeSearch();
      }
    },
    [findNext, findPrevious, closeSearch],
  );

  // Handle Cmd+F keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        openSearch();
      }
    };

    const container = terminalRef.current;
    if (container) {
      container.addEventListener("keydown", handleKeyDown);
      return () => container.removeEventListener("keydown", handleKeyDown);
    }
  }, [openSearch]);

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <span className="terminal-title">Agent Terminal</span>
        <div className="terminal-header-right">
          <button
            onClick={clearBuffer}
            className="terminal-btn"
            title="Clear scrollback buffer"
          >
            <svg
              className="terminal-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <button
            onClick={openSearch}
            className="terminal-btn"
            title="Search (⌘F)"
          >
            <svg
              className="terminal-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="terminal-btn"
              title="Refresh status"
            >
              <svg
                className="terminal-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
          <span
            className={`terminal-status ${connected ? "connected" : "disconnected"}`}
          >
            {connected ? (running ? "Running" : "Connected") : "Disconnected"}
          </span>
        </div>
      </div>
      {/* Search bar */}
      {showSearch && (
        <div className="terminal-search-bar">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search..."
            className="terminal-search-input"
            data-testid="terminal-search-input"
          />
          <button
            onClick={findPrevious}
            className="terminal-search-btn"
            title="Previous (Shift+Enter)"
          >
            <svg
              className="terminal-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
          <button
            onClick={findNext}
            className="terminal-search-btn"
            title="Next (Enter)"
          >
            <svg
              className="terminal-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            onClick={closeSearch}
            className="terminal-search-btn"
            title="Close (Esc)"
          >
            <svg
              className="terminal-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
      <div
        ref={terminalRef}
        className="terminal-content"
        data-testid="terminal"
      />
      <style>{`
        .terminal-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1e1e1e;
          border-radius: 8px;
          overflow: hidden;
        }
        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #2d2d2d;
          border-bottom: 1px solid #3d3d3d;
        }
        .terminal-title {
          color: #d4d4d4;
          font-size: 13px;
          font-weight: 500;
        }
        .terminal-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .terminal-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #888;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .terminal-btn:hover {
          color: #d4d4d4;
          background: #3d3d3d;
        }
        .terminal-icon {
          width: 16px;
          height: 16px;
        }
        .terminal-status {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .terminal-status.connected {
          color: #0dbc79;
          background: rgba(13, 188, 121, 0.1);
        }
        .terminal-status.disconnected {
          color: #666;
          background: rgba(102, 102, 102, 0.1);
        }
        .terminal-content {
          flex: 1;
          padding: 8px;
          min-height: 0;
          overflow: hidden;
        }
        /* Hide xterm cursor completely */
        .terminal-content .xterm-cursor-layer {
          display: none !important;
        }
        .terminal-content .xterm-helper-textarea {
          opacity: 0 !important;
        }
        .terminal-search-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: #252526;
          border-bottom: 1px solid #3d3d3d;
        }
        .terminal-search-input {
          flex: 1;
          background: #3c3c3c;
          border: 1px solid #4d4d4d;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 13px;
          color: #d4d4d4;
          outline: none;
        }
        .terminal-search-input:focus {
          border-color: #007acc;
        }
        .terminal-search-input::placeholder {
          color: #888;
        }
        .terminal-search-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #888;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .terminal-search-btn:hover {
          color: #d4d4d4;
          background: #3d3d3d;
        }
      `}</style>
    </div>
  );
}

export default Terminal;
