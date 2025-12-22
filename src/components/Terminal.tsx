import { useEffect, useRef, useCallback, useState, memo, forwardRef, useImperativeHandle } from "react";
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
import {
  generateSessionPrompt,
  generateContextHeader,
  type SessionScope,
} from "../services/promptGenerator";
import { getApiBaseUrl } from "../lib/environment";
import {
  getClaudeSessionId,
  buildContextKey,
} from "../services/claudeSessionStore";
import { pollForClaudeSession } from "../services/claudeSessionDetector";

type ContextType = "task" | "epic" | "project" | "prd" | "prd-workshop" | "release";

interface TerminalProps {
  contextType?: ContextType;
  contextId?: string;
  contextDisplayKey?: string;
  contextTitle?: string;
  projectRef?: string;
  workingDirectory?: string;
  initialCommand?: string;
  initialPrompt?: string; // Prompt to send to Claude after it starts
  onStatusChange?: (running: boolean) => void;
  onConnectionChange?: (connected: boolean) => void;
}

// Methods exposed to parent via ref
export interface TerminalRef {
  scrollToBottom: () => void;
  clearBuffer: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  findNext: () => void;
  findPrevious: () => void;
  isSearchOpen: () => boolean;
}

/**
 * Terminal - Headless terminal component with WebGL rendering
 *
 * Control methods are exposed via ref for parent to manage UI
 */
const TerminalComponent = forwardRef<TerminalRef, TerminalProps>(function Terminal(
  {
    contextType = "task",
    contextId,
    contextDisplayKey,
    contextTitle,
    projectRef,
    workingDirectory,
    initialCommand,
    initialPrompt,
    onStatusChange,
    onConnectionChange,
  },
  ref
) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sessionId = `${contextType}-${contextId}`;
  const initialCommandSentRef = useRef(false);
  const initialPromptSentRef = useRef(false);

  // Refs for context values
  const contextDisplayKeyRef = useRef(contextDisplayKey);
  const contextTitleRef = useRef(contextTitle);
  const projectRefRef = useRef(projectRef);

  useEffect(() => { contextDisplayKeyRef.current = contextDisplayKey; }, [contextDisplayKey]);
  useEffect(() => { contextTitleRef.current = contextTitle; }, [contextTitle]);
  useEffect(() => { projectRefRef.current = projectRef; }, [projectRef]);

  // Refs for callbacks
  const onStatusChangeRef = useRef(onStatusChange);
  const onConnectionChangeRef = useRef(onConnectionChange);

  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);
  useEffect(() => { onConnectionChangeRef.current = onConnectionChange; }, [onConnectionChange]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => xtermRef.current?.scrollToBottom(),
    clearBuffer: () => xtermRef.current?.clear(),
    openSearch: () => {
      setShowSearch(true);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    },
    closeSearch: () => {
      setShowSearch(false);
      setSearchQuery("");
      xtermRef.current?.focus();
    },
    findNext: () => {
      if (searchQuery && searchAddonRef.current) {
        searchAddonRef.current.findNext(searchQuery);
      }
    },
    findPrevious: () => {
      if (searchQuery && searchAddonRef.current) {
        searchAddonRef.current.findPrevious(searchQuery);
      }
    },
    isSearchOpen: () => showSearch,
  }), [searchQuery, showSearch]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: false,
      cursorStyle: "bar",
      cursorInactiveStyle: "none",
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
      scrollback: 5000,  // Reduced from 10000 to reduce memory pressure
      allowTransparency: false,
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

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    const searchAddon = new SearchAddon();
    term.loadAddon(searchAddon);
    searchAddonRef.current = searchAddon;

    term.open(terminalRef.current);
    fitAddon.fit();

    // Try WebGL renderer for better performance
    let webglAddon: WebglAddon | null = null;
    try {
      webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        console.warn('[Terminal] WebGL context lost, falling back to canvas renderer');
        try {
          webglAddon?.dispose();
        } catch {
          // Ignore disposal errors
        }
        webglAddon = null;
        // Terminal automatically continues with canvas renderer
      });
      term.loadAddon(webglAddon);
    } catch (e) {
      console.warn('[Terminal] WebGL not available, using canvas renderer:', e);
      webglAddon = null;
    }

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Debounced resize handler
    let lastWidth = 0;
    let lastHeight = 0;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!terminalRef.current || !fitAddon) return;
        const { width, height } = terminalRef.current.getBoundingClientRect();
        if (Math.abs(width - lastWidth) < 5 && Math.abs(height - lastHeight) < 5) return;
        lastWidth = width;
        lastHeight = height;
        try {
          fitAddon.fit();
          resizeTerminalIpc(sessionId, term.cols, term.rows).catch(() => {});
        } catch {
          // Ignore fit errors - can happen during cleanup
        }
      }, 100);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      webglAddon?.dispose();
      term.dispose();
    };
  }, [sessionId]);

  // Connect via Tauri IPC
  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !contextId) return;

    let cancelled = false;
    let outputUnlisten: (() => void) | undefined;
    let exitUnlisten: (() => void) | undefined;
    let inputDisposer: { dispose: () => void } | undefined;
    const runningRef = { current: false };

    const connect = async () => {
      try {
        const exists = await hasTerminalSession(sessionId);
        if (cancelled) return;

        // Track if this is a fresh session (for sending initial command/prompt)
        const isNewSession = !exists;

        if (!exists) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          if (cancelled) return;

          const env: Record<string, string> = {};
          env.SPECFLUX_API_URL = getApiBaseUrl();
          if (projectRefRef.current) env.SPECFLUX_PROJECT_REF = projectRefRef.current;
          if (contextId) {
            env.SPECFLUX_CONTEXT_TYPE = contextType;
            env.SPECFLUX_CONTEXT_ID = contextId;
          }
          if (contextDisplayKeyRef.current) {
            env.SPECFLUX_CONTEXT_REF = contextDisplayKeyRef.current;
            env.SPECFLUX_CONTEXT_DISPLAY_KEY = contextDisplayKeyRef.current;
          }
          if (contextTitleRef.current) env.SPECFLUX_CONTEXT_TITLE = contextTitleRef.current;

          if (projectRefRef.current && contextId && ["task", "epic", "release"].includes(contextType)) {
            const sessionContext = {
              scope: contextType as SessionScope,
              ref: contextId,
              displayKey: contextDisplayKeyRef.current,
              title: contextTitleRef.current,
              projectRef: projectRefRef.current,
            };
            env.SPECFLUX_SESSION_PROMPT = generateSessionPrompt(sessionContext);
            env.SPECFLUX_CONTEXT_HEADER = generateContextHeader(sessionContext);
          }

          await spawnTerminal(sessionId, workingDirectory, Object.keys(env).length > 0 ? env : undefined);
        }

        if (cancelled) return;

        runningRef.current = true;
        onConnectionChangeRef.current?.(true);
        onStatusChangeRef.current?.(true);

        await resizeTerminalIpc(sessionId, term.cols, term.rows);

        // Only send initial command/prompt for newly created sessions
        if (isNewSession && initialCommand && !initialCommandSentRef.current) {
          initialCommandSentRef.current = true;

          // Check for existing Claude session to resume
          let commandToSend = initialCommand;
          const contextKey = buildContextKey(contextType, contextId);

          let isResumingSession = false;
          if (workingDirectory && initialCommand === "claude") {
            try {
              const existingClaudeSession = await getClaudeSessionId(workingDirectory, contextKey);
              if (existingClaudeSession) {
                commandToSend = `claude --resume ${existingClaudeSession}`;
                isResumingSession = true;
                console.log(`Resuming Claude session: ${existingClaudeSession}`);
              }
            } catch (error) {
              console.warn("Failed to check for Claude session:", error);
            }
          }

          setTimeout(async () => {
            if (!cancelled) await writeToTerminal(sessionId, commandToSend + "\n");

            // If resuming, send Enter after a delay to confirm the picker
            if (isResumingSession) {
              setTimeout(async () => {
                if (!cancelled) await writeToTerminal(sessionId, "\r");
              }, 1500); // Wait for picker to load
            }

            // Start polling for Claude session (to save for future resume)
            if (workingDirectory && initialCommand === "claude") {
              pollForClaudeSession(workingDirectory, contextKey);
            }
          }, 500);
        }

        if (isNewSession && initialPrompt && !initialPromptSentRef.current) {
          initialPromptSentRef.current = true;
          // Wait for Claude to fully start up (8s after command, 2s otherwise)
          const promptDelay = initialCommand ? 8000 : 2000;
          setTimeout(async () => {
            if (!cancelled && runningRef.current) {
              // Send prompt text first, then Enter to submit
              await writeToTerminal(sessionId, initialPrompt);
              // Small delay then send Enter to submit the message
              setTimeout(async () => {
                if (!cancelled && runningRef.current) {
                  await writeToTerminal(sessionId, "\r");
                }
              }, 100);
            }
          }, promptDelay);
        }

        outputUnlisten = await onTerminalOutput((event) => {
          if (event.sessionId === sessionId) {
            term.write(new Uint8Array(event.data));
          }
        });

        exitUnlisten = await onTerminalExit((event) => {
          if (event.sessionId === sessionId) {
            runningRef.current = false;
            onStatusChangeRef.current?.(false);
            term.writeln("");
            term.writeln(event.exitCode === 0
              ? "\x1b[32mTerminal session ended.\x1b[0m"
              : `\x1b[31mTerminal exited with code ${event.exitCode}\x1b[0m`);
          }
        });

        inputDisposer = term.onData((data) => {
          if (runningRef.current) {
            const filtered = data
              .replace(/\x1b\[<\d+;\d+;\d+[Mm]/g, "")
              .replace(/\x1b\[M[\x00-\xff]{3}/g, "")
              .replace(/\x1b\[[IO]/g, "");
            if (filtered) writeToTerminal(sessionId, filtered).catch(() => {});
          }
        });
      } catch (error) {
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
      closeTerminal(sessionId).catch(() => {});
    };
  }, [sessionId, contextId, workingDirectory, contextType, initialCommand, initialPrompt]);

  // Search handlers
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        searchAddonRef.current?.findPrevious(searchQuery);
      } else {
        searchAddonRef.current?.findNext(searchQuery);
      }
    } else if (e.key === "Escape") {
      setShowSearch(false);
      setSearchQuery("");
      xtermRef.current?.focus();
    }
  }, [searchQuery]);

  // Cmd+F shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    const container = terminalRef.current;
    if (container) {
      container.addEventListener("keydown", handleKeyDown);
      return () => container.removeEventListener("keydown", handleKeyDown);
    }
  }, []);

  return (
    <div className="terminal-wrapper">
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
          />
          <button onClick={() => searchAddonRef.current?.findPrevious(searchQuery)} className="terminal-search-btn" title="Previous">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button onClick={() => searchAddonRef.current?.findNext(searchQuery)} className="terminal-search-btn" title="Next">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); xtermRef.current?.focus(); }} className="terminal-search-btn" title="Close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div ref={terminalRef} className="terminal-content" data-testid="terminal" />
      <style>{`
        .terminal-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1e1e1e;
        }
        .terminal-content {
          flex: 1;
          padding: 8px;
          min-height: 0;
        }
        .terminal-content .xterm-cursor-layer { display: none !important; }
        .terminal-content .xterm-helper-textarea { opacity: 0 !important; }
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
        .terminal-search-input:focus { border-color: #007acc; }
        .terminal-search-input::placeholder { color: #888; }
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
        .terminal-search-btn:hover { color: #d4d4d4; background: #3d3d3d; }
      `}</style>
    </div>
  );
});

export default memo(TerminalComponent);
export { TerminalComponent as Terminal };
