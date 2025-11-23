import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { parse } from 'url';
import {
  getAgentEmitter,
  sendAgentInput,
  resizeAgentPty,
  isAgentRunning,
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

  // Subscribe to agent output if running
  const emitter = getAgentEmitter(taskId);
  const dataHandler = (data: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'output',
          data,
        })
      );
    }
  };

  const exitHandler = (exitCode: number) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'exit',
          exitCode,
        })
      );
    }
  };

  if (emitter) {
    emitter.on('data', dataHandler);
    emitter.on('exit', exitHandler);
  }

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

    // Remove listeners
    if (emitter) {
      emitter.off('data', dataHandler);
      emitter.off('exit', exitHandler);
    }
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
