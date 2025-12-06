//! PTY Manager
//!
//! Manages multiple PTY sessions with thread-safe access.

use parking_lot::RwLock;
use std::collections::HashMap;
use tauri::AppHandle;

use super::session::PtySession;

/// State container for PTY sessions
#[derive(Default)]
pub struct PtyState {
    sessions: RwLock<HashMap<String, PtySession>>,
}

impl PtyState {
    /// Create a new PTY state container
    pub fn new() -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
        }
    }

    /// Spawn a new terminal session
    pub fn spawn_session(
        &self,
        session_id: String,
        cwd: Option<String>,
        env: Option<HashMap<String, String>>,
        app: AppHandle,
    ) -> Result<(), String> {
        // Check if session already exists
        {
            let sessions = self.sessions.read();
            if sessions.contains_key(&session_id) {
                return Err(format!("Session {} already exists", session_id));
            }
        }

        // Create new session
        let session = PtySession::spawn(session_id.clone(), cwd, env, app)?;

        // Store session
        {
            let mut sessions = self.sessions.write();
            sessions.insert(session_id, session);
        }

        Ok(())
    }

    /// Write data to a terminal session
    pub fn write_to_session(&self, session_id: &str, data: &[u8]) -> Result<(), String> {
        let sessions = self.sessions.read();
        let session = sessions
            .get(session_id)
            .ok_or_else(|| format!("Session {} not found", session_id))?;
        session.write(data)
    }

    /// Resize a terminal session
    pub fn resize_session(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.read();
        let session = sessions
            .get(session_id)
            .ok_or_else(|| format!("Session {} not found", session_id))?;
        session.resize(cols, rows)
    }

    /// Close and remove a terminal session
    pub fn close_session(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.write();
        if let Some(session) = sessions.remove(session_id) {
            session.close();
            Ok(())
        } else {
            Err(format!("Session {} not found", session_id))
        }
    }

    /// List all active session IDs
    pub fn list_sessions(&self) -> Vec<String> {
        let sessions = self.sessions.read();
        sessions.keys().cloned().collect()
    }

    /// Check if a session exists
    pub fn has_session(&self, session_id: &str) -> bool {
        let sessions = self.sessions.read();
        sessions.contains_key(session_id)
    }
}
