import { createServer } from 'http';
import app from './app';
import { createTerminalWebSocketServer } from './websocket/terminal';
import { cleanupStaleSessions } from './services/agent.service';

const PORT = process.env['PORT'] ?? 3000;

// Create HTTP server
const server = createServer(app);

// Attach WebSocket server for terminal streaming
createTerminalWebSocketServer(server);

// Cleanup any stale agent sessions from previous runs
cleanupStaleSessions();

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`WebSocket terminal: ws://localhost:${PORT}/ws/terminal/:taskId`);
});

export default app;
