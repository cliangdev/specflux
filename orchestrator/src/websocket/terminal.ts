import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { parse } from 'url';
import { EventEmitter } from 'events';
import {
  getAgentEmitterForContext,
  sendAgentInputForContext,
  resizeAgentPtyForContext,
  isAgentRunningForContext,
  agentLifecycleEmitter,
  ContextType as AgentContextType,
} from '../services/agent.service';

type ContextType = 'task' | 'epic' | 'project';

interface TerminalClient {
  ws: WebSocket;
  contextType: ContextType;
  contextId: number;
  // Backwards compat alias
  taskId: number;
}

// Track connected clients per context (key format: "type-id", e.g., "task-123")
const clientsByContext = new Map<string, Set<TerminalClient>>();

// Helper to create context key
function contextKey(type: ContextType, id: number): string {
  return `${type}-${id}`;
}

/**
 * Create WebSocket server for terminal streaming
 */
export function createTerminalWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests
  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const { pathname } = parse(request.url ?? '', true);

    // Match /ws/terminal/:contextType/:contextId
    const match = pathname?.match(/^\/ws\/terminal\/(task|epic|project)\/(\d+)$/);
    if (match?.[1] && match?.[2]) {
      const contextType = match[1] as ContextType;
      const contextId = parseInt(match[2], 10);

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, contextType, contextId);
      });
    } else {
      // Not a terminal WebSocket request
      socket.destroy();
    }
  });

  // Handle new connections
  wss.on(
    'connection',
    (ws: WebSocket, _request: IncomingMessage, contextType: ContextType, contextId: number) => {
      handleConnection(ws, contextType, contextId);
    }
  );

  return wss;
}

/**
 * Handle a new WebSocket connection for a context
 */
function handleConnection(ws: WebSocket, contextType: ContextType, contextId: number): void {
  // Project context is not yet supported
  if (contextType === 'project') {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: `Context type "project" is not yet supported. Only "task" and "epic" are currently available.`,
      })
    );
    ws.close();
    return;
  }

  const key = contextKey(contextType, contextId);
  const client: TerminalClient = {
    ws,
    contextType,
    contextId,
    taskId: contextId, // Backwards compat alias (for task context)
  };

  // Add to client set
  if (!clientsByContext.has(key)) {
    clientsByContext.set(key, new Set());
  }
  clientsByContext.get(key)!.add(client);

  // Send initial status
  ws.send(
    JSON.stringify({
      type: 'status',
      running: isAgentRunningForContext(contextType as AgentContextType, contextId),
      contextType,
      contextId,
      // Backwards compat for task context
      ...(contextType === 'task' ? { taskId: contextId } : {}),
    })
  );

  // Track current emitter subscription
  let currentEmitter: EventEmitter | null = null;

  // DEBUG
  const DEBUG_TERMINAL = process.env['DEBUG_TERMINAL'] === '1';
  let wsMessageCount = 0;

  // Event handlers
  const dataHandler = (data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      wsMessageCount++;

      // DEBUG: Log WebSocket messages containing "Please work" or "review this epic"
      if (DEBUG_TERMINAL && (data.includes('Please work') || data.includes('review this epic'))) {
        console.log(
          `[WS DEBUG] ${contextType} ${contextId} sending msg #${wsMessageCount} with prompt`
        );
        console.log(`[WS DEBUG] Data length: ${data.length}`);
      }

      ws.send(JSON.stringify({ type: 'output', data }));
    }
  };

  const exitHandler = (exitCode: number) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', exitCode }));
    }
  };

  const progressHandler = (event: { taskId: number; progress: number }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'progress', progress: event.progress }));
    }
  };

  const fileChangeHandler = (event: {
    taskId: number;
    sessionId: number;
    action: string;
    filePath: string;
  }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'file-change',
          action: event.action,
          filePath: event.filePath,
        })
      );
    }
  };

  const testResultHandler = (event: {
    taskId: number;
    passed: number;
    failed: number;
    total: number;
  }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'test-result',
          passed: event.passed,
          failed: event.failed,
          total: event.total,
        })
      );
    }
  };

  // Helper to subscribe to an emitter
  const subscribeToEmitter = (emitter: EventEmitter) => {
    // If already subscribed to this exact emitter, do nothing
    if (currentEmitter === emitter) {
      return;
    }

    // Unsubscribe from previous emitter if any
    if (currentEmitter) {
      currentEmitter.off('data', dataHandler);
      currentEmitter.off('exit', exitHandler);
      currentEmitter.off('progress', progressHandler);
      currentEmitter.off('file-change', fileChangeHandler);
      currentEmitter.off('test-result', testResultHandler);
    }
    currentEmitter = emitter;
    emitter.on('data', dataHandler);
    emitter.on('exit', exitHandler);
    emitter.on('progress', progressHandler);
    emitter.on('file-change', fileChangeHandler);
    emitter.on('test-result', testResultHandler);
  };

  // Subscribe to agent output if already running
  const initialEmitter = getAgentEmitterForContext(contextType as AgentContextType, contextId);
  if (initialEmitter) {
    subscribeToEmitter(initialEmitter);
  }

  // Listen for agent lifecycle events (when agent starts after WS connection)
  const agentStartedHandler = (event: {
    contextType?: AgentContextType;
    contextId?: number;
    taskId?: number;
    emitter: EventEmitter;
  }) => {
    // Match on contextType and contextId, or fallback to taskId for backwards compat
    const matches =
      (event.contextType === contextType && event.contextId === contextId) ||
      (contextType === 'task' && event.taskId === contextId);

    if (matches && ws.readyState === WebSocket.OPEN) {
      // Send status update
      ws.send(
        JSON.stringify({
          type: 'status',
          running: true,
          contextType,
          contextId,
          ...(contextType === 'task' ? { taskId: contextId } : {}),
        })
      );
      // Subscribe to the new emitter
      // Note: Clear screen is sent from agent.service.ts before first PTY output
      subscribeToEmitter(event.emitter);
    }
  };
  agentLifecycleEmitter.on('agent-started', agentStartedHandler);

  // Handle incoming messages
  ws.on('message', (message: Buffer) => {
    try {
      const msg = JSON.parse(message.toString()) as {
        type: string;
        data?: string;
        cols?: number;
        rows?: number;
      };
      handleClientMessage(contextType as AgentContextType, contextId, msg);
    } catch {
      // Ignore invalid messages
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    clientsByContext.get(key)?.delete(client);

    // Clean up empty context sets
    if (clientsByContext.get(key)?.size === 0) {
      clientsByContext.delete(key);
    }

    // Remove listeners from current emitter
    if (currentEmitter) {
      currentEmitter.off('data', dataHandler);
      currentEmitter.off('exit', exitHandler);
      currentEmitter.off('progress', progressHandler);
      currentEmitter.off('file-change', fileChangeHandler);
      currentEmitter.off('test-result', testResultHandler);
    }

    // Remove lifecycle listener
    agentLifecycleEmitter.off('agent-started', agentStartedHandler);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${contextType} ${contextId}:`, error.message);
  });
}

/**
 * Filter out mouse input sequences from terminal input
 * xterm.js sends these when mouse mode is enabled by the application
 *
 * Mouse sequences:
 * - SGR format: ESC[<Cb;Cx;CyM or ESC[<Cb;Cx;Cym (button;col;row + M for press, m for release)
 * - X10/Normal format: ESC[M followed by 3 bytes
 * - Focus events: ESC[I (focus in) and ESC[O (focus out) - enabled by ESC[?1004h
 */
function filterMouseInput(data: string): string {
  // Filter SGR mouse sequences: ESC[<...M or ESC[<...m
  // eslint-disable-next-line no-control-regex
  const sgrMouseRegex = /\x1b\[<\d+;\d+;\d+[Mm]/g;

  // Filter X10/Normal mouse sequences: ESC[M followed by 3 characters
  // eslint-disable-next-line no-control-regex
  const x10MouseRegex = /\x1b\[M.../g;

  // Filter focus events: ESC[I and ESC[O
  // eslint-disable-next-line no-control-regex
  const focusRegex = /\x1b\[[IO]/g;

  let filtered = data.replace(sgrMouseRegex, '');
  filtered = filtered.replace(x10MouseRegex, '');
  filtered = filtered.replace(focusRegex, '');

  return filtered;
}

/**
 * Handle messages from WebSocket client
 */
function handleClientMessage(
  contextType: AgentContextType,
  contextId: number,
  msg: { type: string; data?: string; cols?: number; rows?: number }
): void {
  switch (msg.type) {
    case 'input':
      if (msg.data && isAgentRunningForContext(contextType, contextId)) {
        // Filter out mouse sequences - we only want keyboard input
        const filteredData = filterMouseInput(msg.data);

        // DEBUG: Log input to see what's being received
        if (process.env['DEBUG_TERMINAL'] === '1') {
          const original = JSON.stringify(msg.data);
          const filtered = JSON.stringify(filteredData);
          if (original !== filtered) {
            console.log(
              `[WS INPUT] ${contextType} ${contextId} filtered mouse: ${original} -> ${filtered}`
            );
          }
        }

        if (filteredData) {
          try {
            sendAgentInputForContext(contextType, contextId, filteredData);
          } catch {
            // Agent might have stopped
          }
        }
      }
      break;

    case 'resize':
      if (msg.cols && msg.rows && isAgentRunningForContext(contextType, contextId)) {
        // DEBUG: Log resize requests
        if (process.env['DEBUG_TERMINAL'] === '1') {
          console.log(
            `[WS DEBUG] ${contextType} ${contextId} resize request: cols=${msg.cols}, rows=${msg.rows}`
          );
        }
        try {
          resizeAgentPtyForContext(contextType, contextId, msg.cols, msg.rows);
        } catch {
          // Agent might have stopped
        }
      }
      break;

    default:
      // Unknown message type
      break;
  }
}

/**
 * Broadcast message to all clients connected to a task
 */
export function broadcastToTask(taskId: number, message: object): void {
  // For backwards compat, broadcast to task context
  broadcastToContext('task', taskId, message);
}

/**
 * Broadcast message to all clients connected to a context
 */
export function broadcastToContext(
  contextType: ContextType,
  contextId: number,
  message: object
): void {
  const key = contextKey(contextType, contextId);
  const clients = clientsByContext.get(key);
  if (!clients) return;

  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

/**
 * Get count of connected clients for a task
 */
export function getClientCount(taskId: number): number {
  return getContextClientCount('task', taskId);
}

/**
 * Get count of connected clients for a context
 */
export function getContextClientCount(contextType: ContextType, contextId: number): number {
  const key = contextKey(contextType, contextId);
  return clientsByContext.get(key)?.size ?? 0;
}

/**
 * Get all task IDs with active connections
 */
export function getActiveTaskIds(): number[] {
  // Filter to task contexts only and extract IDs
  return Array.from(clientsByContext.keys())
    .filter((key) => key.startsWith('task-'))
    .map((key) => {
      const idPart = key.split('-')[1];
      return idPart ? parseInt(idPart, 10) : 0;
    })
    .filter((id) => id > 0);
}

/**
 * Get all context keys with active connections
 */
export function getActiveContexts(): Array<{ type: ContextType; id: number }> {
  return Array.from(clientsByContext.keys()).map((key) => {
    const parts = key.split('-');
    const type = parts[0] ?? 'task';
    const id = parts[1] ? parseInt(parts[1], 10) : 0;
    return { type: type as ContextType, id };
  });
}
