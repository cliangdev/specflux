import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { parse } from 'url';
import { EventEmitter } from 'events';
import {
  getAgentEmitter,
  sendAgentInput,
  resizeAgentPty,
  isAgentRunning,
  agentLifecycleEmitter,
} from '../services/agent.service';

interface TerminalClient {
  ws: WebSocket;
  taskId: number;
}

// Track connected clients per task
const clientsByTask = new Map<number, Set<TerminalClient>>();

/**
 * Create WebSocket server for terminal streaming
 */
export function createTerminalWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests
  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const { pathname } = parse(request.url ?? '', true);

    // Match /ws/terminal/:taskId
    const match = pathname?.match(/^\/ws\/terminal\/(\d+)$/);
    if (match?.[1]) {
      const taskId = parseInt(match[1], 10);

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, taskId);
      });
    } else {
      // Not a terminal WebSocket request
      socket.destroy();
    }
  });

  // Handle new connections
  wss.on('connection', (ws: WebSocket, _request: IncomingMessage, taskId: number) => {
    handleConnection(ws, taskId);
  });

  return wss;
}

/**
 * Handle a new WebSocket connection for a task
 */
function handleConnection(ws: WebSocket, taskId: number): void {
  const client: TerminalClient = { ws, taskId };

  // Add to client set
  if (!clientsByTask.has(taskId)) {
    clientsByTask.set(taskId, new Set());
  }
  clientsByTask.get(taskId)!.add(client);

  // Send initial status
  ws.send(
    JSON.stringify({
      type: 'status',
      running: isAgentRunning(taskId),
      taskId,
    })
  );

  // Track current emitter subscription
  let currentEmitter: EventEmitter | null = null;

  // Event handlers
  const dataHandler = (data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
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
  const initialEmitter = getAgentEmitter(taskId);
  if (initialEmitter) {
    subscribeToEmitter(initialEmitter);
  }

  // Listen for agent lifecycle events (when agent starts after WS connection)
  const agentStartedHandler = (event: { taskId: number; emitter: EventEmitter }) => {
    if (event.taskId === taskId && ws.readyState === WebSocket.OPEN) {
      // Send status update
      ws.send(JSON.stringify({ type: 'status', running: true, taskId }));
      // Subscribe to the new emitter
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
      handleClientMessage(taskId, msg);
    } catch {
      // Ignore invalid messages
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    clientsByTask.get(taskId)?.delete(client);

    // Clean up empty task sets
    if (clientsByTask.get(taskId)?.size === 0) {
      clientsByTask.delete(taskId);
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
    console.error(`WebSocket error for task ${taskId}:`, error.message);
  });
}

/**
 * Handle messages from WebSocket client
 */
function handleClientMessage(
  taskId: number,
  msg: { type: string; data?: string; cols?: number; rows?: number }
): void {
  switch (msg.type) {
    case 'input':
      if (msg.data && isAgentRunning(taskId)) {
        try {
          sendAgentInput(taskId, msg.data);
        } catch {
          // Agent might have stopped
        }
      }
      break;

    case 'resize':
      if (msg.cols && msg.rows && isAgentRunning(taskId)) {
        try {
          resizeAgentPty(taskId, msg.cols, msg.rows);
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
  const clients = clientsByTask.get(taskId);
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
  return clientsByTask.get(taskId)?.size ?? 0;
}

/**
 * Get all task IDs with active connections
 */
export function getActiveTaskIds(): number[] {
  return Array.from(clientsByTask.keys());
}
