//! Terminal Commands
//!
//! Tauri commands for terminal management via IPC.

use std::collections::HashMap;
use tauri::{AppHandle, State};

use crate::pty::PtyState;

/// Spawn a new terminal session
#[tauri::command]
pub async fn spawn_terminal(
    session_id: String,
    cwd: Option<String>,
    env: Option<HashMap<String, String>>,
    state: State<'_, PtyState>,
    app: AppHandle,
) -> Result<(), String> {
    state.spawn_session(session_id, cwd, env, app)
}

/// Write input data to a terminal session
#[tauri::command]
pub async fn terminal_write(session_id: String, data: String, state: State<'_, PtyState>) -> Result<(), String> {
    state.write_to_session(&session_id, data.as_bytes())
}

/// Resize a terminal session
#[tauri::command]
pub async fn terminal_resize(
    session_id: String,
    cols: u16,
    rows: u16,
    state: State<'_, PtyState>,
) -> Result<(), String> {
    state.resize_session(&session_id, cols, rows)
}

/// Close a terminal session
#[tauri::command]
pub async fn terminal_close(session_id: String, state: State<'_, PtyState>) -> Result<(), String> {
    state.close_session(&session_id)
}

/// List all active terminal sessions
#[tauri::command]
pub async fn list_terminal_sessions(state: State<'_, PtyState>) -> Result<Vec<String>, String> {
    Ok(state.list_sessions())
}

/// Check if a terminal session exists
#[tauri::command]
pub async fn has_terminal_session(session_id: String, state: State<'_, PtyState>) -> Result<bool, String> {
    Ok(state.has_session(&session_id))
}
