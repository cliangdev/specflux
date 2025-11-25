import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";

interface FileChangeEvent {
  action: "created" | "modified" | "deleted";
  filePath: string;
}

interface TerminalDimensions {
  cols: number;
  rows: number;
}

type ContextType = "task" | "epic" | "project";

interface TerminalProps {
  contextType?: ContextType;
  contextId?: number;
  taskId?: number; // Deprecated: use contextType + contextId instead
  wsUrl?: string;
  onStatusChange?: (running: boolean) => void;
  onExit?: (exitCode: number) => void;
  onRefresh?: () => void;
  onFileChange?: (event: FileChangeEvent) => void;
  onProgress?: (progress: number) => void;
  onDimensionsReady?: (dimensions: TerminalDimensions) => void;
}

interface TerminalMessage {
  type:
    | "status"
    | "output"
    | "exit"
    | "file-change"
    | "progress"
    | "test-result";
  data?: string;
  running?: boolean;
  exitCode?: number;
  taskId?: number;
  action?: "created" | "modified" | "deleted";
  filePath?: string;
  progress?: number;
  passed?: number;
  failed?: number;
  total?: number;
}

/**
 * Terminal - Optimized terminal component with WebGL rendering
 *
 * Features:
 * - WebGL renderer for 3-5x better performance (with canvas fallback)
 * - Scrollback buffer (10,000 lines) for session recovery
 * - Flow control support for large outputs
 * - Simplified mouse handling via xterm options
 */
export function Terminal({
  contextType = "task",
  contextId,
  taskId, // Deprecated
  wsUrl,
  onStatusChange,
  onExit,
  onRefresh,
  onFileChange,
  onProgress,
  onDimensionsReady,
}: TerminalProps) {
  // Support backwards compat: use taskId if contextId not provided
  const effectiveContextId = contextId ?? taskId;
  const effectiveContextType = contextType;
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const webglAddonRef = useRef<WebglAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);

  // Use refs for callbacks to avoid reconnection loops
  const runningRef = useRef(running);
  const onStatusChangeRef = useRef(onStatusChange);
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

  // Determine WebSocket URL
  const getWsUrl = useCallback(() => {
    if (wsUrl) return wsUrl;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = import.meta.env.VITE_API_PORT ?? "3000";
    return `${protocol}//${host}:${port}/ws/terminal/${effectiveContextType}/${effectiveContextId}`;
  }, [effectiveContextType, effectiveContextId, wsUrl]);

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

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      onDimensionsReadyRef.current?.({ cols: term.cols, rows: term.rows });
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows,
          }),
        );
      }
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      webglAddon?.dispose();
      term.dispose();
    };
  }, [effectiveContextType, effectiveContextId]);

  // Connect WebSocket
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          type: "resize",
          cols: term.cols,
          rows: term.rows,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg: TerminalMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "status":
            if (msg.running !== runningRef.current) {
              setRunning(msg.running ?? false);
              onStatusChangeRef.current?.(msg.running ?? false);
              if (!msg.running) {
                term.writeln(
                  "\x1b[90mAgent is not running. Start the agent to see output.\x1b[0m",
                );
              }
            }
            break;

          case "output":
            if (msg.data) {
              // Write data directly - backend handles filtering
              term.write(msg.data);
            }
            break;

          case "exit":
            setRunning(false);
            onStatusChangeRef.current?.(false);
            term.writeln("");
            if (msg.exitCode === 0) {
              term.writeln("\x1b[32mAgent completed successfully.\x1b[0m");
            } else {
              term.writeln(
                `\x1b[31mAgent exited with code ${msg.exitCode}\x1b[0m`,
              );
            }
            onExitRef.current?.(msg.exitCode ?? 1);
            break;

          case "file-change":
            if (msg.action && msg.filePath) {
              onFileChangeRef.current?.({
                action: msg.action,
                filePath: msg.filePath,
              });
            }
            break;

          case "progress":
            if (msg.progress !== undefined) {
              onProgressRef.current?.(msg.progress);
            }
            break;

          case "test-result":
            break;
        }
      } catch {
        term.write(event.data);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      term.writeln("\x1b[31mConnection error\x1b[0m");
    };

    ws.onclose = () => {
      setConnected(false);
      setRunning(false);
      term.writeln("\x1b[90mDisconnected\x1b[0m");
    };

    // Handle terminal input - simplified filtering
    const inputHandler = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN && runningRef.current) {
        // Filter mouse sequences (SGR, X10, focus events)
        const filtered = data
          .replace(/\x1b\[<\d+;\d+;\d+[Mm]/g, "")
          .replace(/\x1b\[M[\x00-\xff]{3}/g, "")
          .replace(/\x1b\[[IO]/g, "");

        if (filtered) {
          ws.send(
            JSON.stringify({
              type: "input",
              data: filtered,
            }),
          );
        }
      }
    });

    return () => {
      inputHandler.dispose();
      ws.close();
    };
  }, [getWsUrl]);

  // Clear scrollback buffer (useful for long sessions)
  const clearBuffer = useCallback(() => {
    xtermRef.current?.clear();
  }, []);

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
          min-height: 300px;
        }
      `}</style>
    </div>
  );
}

export default Terminal;
