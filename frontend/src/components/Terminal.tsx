import { useEffect, useRef, useCallback, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  taskId: number;
  wsUrl?: string;
  onStatusChange?: (running: boolean) => void;
  onExit?: (exitCode: number) => void;
}

interface TerminalMessage {
  type: "status" | "output" | "exit";
  data?: string;
  running?: boolean;
  exitCode?: number;
  taskId?: number;
}

export function Terminal({
  taskId,
  wsUrl,
  onStatusChange,
  onExit,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);

  // Determine WebSocket URL
  const getWsUrl = useCallback(() => {
    if (wsUrl) return wsUrl;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = import.meta.env.VITE_API_PORT ?? "3000";
    return `${protocol}//${host}:${port}/ws/terminal/${taskId}`;
  }, [taskId, wsUrl]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
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

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Open terminal in container
    term.open(terminalRef.current);
    fitAddon.fit();

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      // Send resize to server if connected
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

    // Initial greeting
    term.writeln("\x1b[1;34m=== SpecFlux Agent Terminal ===\x1b[0m");
    term.writeln(`\x1b[90mTask ID: ${taskId}\x1b[0m`);
    term.writeln("");

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
    };
  }, [taskId]);

  // Connect WebSocket
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    const url = getWsUrl();
    term.writeln(`\x1b[90mConnecting to ${url}...\x1b[0m`);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      term.writeln("\x1b[32mConnected!\x1b[0m");
      term.writeln("");

      // Send initial resize
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
            setRunning(msg.running ?? false);
            onStatusChange?.(msg.running ?? false);
            if (msg.running) {
              term.writeln("\x1b[33mAgent is running...\x1b[0m");
            } else {
              term.writeln(
                "\x1b[90mAgent is not running. Start the agent to see output.\x1b[0m",
              );
            }
            break;

          case "output":
            if (msg.data) {
              term.write(msg.data);
            }
            break;

          case "exit":
            setRunning(false);
            onStatusChange?.(false);
            term.writeln("");
            if (msg.exitCode === 0) {
              term.writeln("\x1b[32mAgent completed successfully.\x1b[0m");
            } else {
              term.writeln(
                `\x1b[31mAgent exited with code ${msg.exitCode}\x1b[0m`,
              );
            }
            onExit?.(msg.exitCode ?? 1);
            break;
        }
      } catch {
        // Raw text output
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

    // Handle terminal input
    const inputHandler = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN && running) {
        ws.send(
          JSON.stringify({
            type: "input",
            data,
          }),
        );
      }
    });

    return () => {
      inputHandler.dispose();
      ws.close();
    };
  }, [getWsUrl, onStatusChange, onExit, running]);

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <span className="terminal-title">Agent Terminal</span>
        <span
          className={`terminal-status ${connected ? "connected" : "disconnected"}`}
        >
          {connected
            ? running
              ? "● Running"
              : "○ Connected"
            : "○ Disconnected"}
        </span>
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
        .terminal-status {
          font-size: 12px;
        }
        .terminal-status.connected {
          color: #0dbc79;
        }
        .terminal-status.disconnected {
          color: #666;
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
