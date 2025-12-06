/**
 * Tauri Terminal Service
 *
 * Provides TypeScript interface for native terminal operations via Tauri IPC.
 * Replaces WebSocket-based terminal communication with direct IPC calls.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

/** Terminal output event payload from Rust */
export interface TerminalOutputEvent {
  sessionId: string;
  data: number[]; // Raw bytes as array (Uint8Array in JS)
}

/** Terminal exit event payload from Rust */
export interface TerminalExitEvent {
  sessionId: string;
  exitCode: number | null;
}

/**
 * Spawn a new terminal session.
 *
 * @param sessionId - Unique identifier for the session (e.g., "task-123")
 * @param cwd - Working directory for the shell
 * @param env - Additional environment variables
 */
export async function spawnTerminal(
  sessionId: string,
  cwd?: string,
  env?: Record<string, string>,
): Promise<void> {
  await invoke("spawn_terminal", {
    sessionId,
    cwd: cwd ?? null,
    env: env ?? null,
  });
}

/**
 * Write input data to a terminal session.
 *
 * @param sessionId - Session identifier
 * @param data - Input data to write (keyboard input)
 */
export async function writeToTerminal(
  sessionId: string,
  data: string,
): Promise<void> {
  await invoke("terminal_write", { sessionId, data });
}

/**
 * Resize a terminal session.
 *
 * @param sessionId - Session identifier
 * @param cols - Number of columns
 * @param rows - Number of rows
 */
export async function resizeTerminal(
  sessionId: string,
  cols: number,
  rows: number,
): Promise<void> {
  await invoke("terminal_resize", {
    sessionId,
    cols,
    rows,
  });
}

/**
 * Close a terminal session.
 *
 * @param sessionId - Session identifier
 */
export async function closeTerminal(sessionId: string): Promise<void> {
  await invoke("terminal_close", { sessionId });
}

/**
 * List all active terminal sessions.
 *
 * @returns Array of session IDs
 */
export async function listTerminalSessions(): Promise<string[]> {
  return await invoke("list_terminal_sessions");
}

/**
 * Check if a terminal session exists.
 *
 * @param sessionId - Session identifier
 * @returns true if session exists
 */
export async function hasTerminalSession(sessionId: string): Promise<boolean> {
  return await invoke("has_terminal_session", { sessionId });
}

/**
 * Listen for terminal output events.
 *
 * @param callback - Function to call when output is received
 * @returns Unlisten function to stop listening
 */
export async function onTerminalOutput(
  callback: (event: TerminalOutputEvent) => void,
): Promise<UnlistenFn> {
  return await listen<TerminalOutputEvent>("terminal-output", (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for terminal exit events.
 *
 * @param callback - Function to call when terminal exits
 * @returns Unlisten function to stop listening
 */
export async function onTerminalExit(
  callback: (event: TerminalExitEvent) => void,
): Promise<UnlistenFn> {
  return await listen<TerminalExitEvent>("terminal-exit", (event) => {
    callback(event.payload);
  });
}
