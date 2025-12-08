//! PTY Session Management
//!
//! Manages a single pseudo-terminal session, handling process spawning,
//! input/output streaming, and resize operations.

use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};

/// Payload for terminal output events
#[derive(Clone, serde::Serialize)]
pub struct TerminalOutputPayload {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub data: Vec<u8>,
}

/// Payload for terminal exit events
#[derive(Clone, serde::Serialize)]
pub struct TerminalExitPayload {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "exitCode")]
    pub exit_code: Option<i32>,
}

/// A single PTY session
#[allow(dead_code)]
pub struct PtySession {
    session_id: String, // Kept for potential debugging use
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    _reader_handle: thread::JoinHandle<()>,
    running: Arc<std::sync::atomic::AtomicBool>,
}

impl PtySession {
    /// Spawn a new PTY session with the given shell
    pub fn spawn(
        session_id: String,
        cwd: Option<String>,
        env: Option<std::collections::HashMap<String, String>>,
        app: AppHandle,
    ) -> Result<Self, String> {
        let pty_system = native_pty_system();

        // Create PTY with initial size
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        // Build shell command
        let shell = std::env::var("SHELL").unwrap_or_else(|_| {
            if cfg!(windows) {
                "cmd.exe".to_string()
            } else {
                "/bin/bash".to_string()
            }
        });

        let mut cmd = CommandBuilder::new(&shell);
        // Start as interactive login shell to properly source all config files
        // -l: login shell (sources .zprofile, .zlogin)
        // -i: interactive shell (sources .zshrc where most config lives)
        cmd.arg("-l");
        cmd.arg("-i");

        // Set working directory
        if let Some(dir) = cwd {
            cmd.cwd(dir);
        }

        // Set environment variables
        if let Some(ref env_vars) = env {
            for (key, value) in env_vars {
                cmd.env(key, value);
            }
        }

        // Set TERM for proper terminal emulation
        cmd.env("TERM", "xterm-256color");

        // Spawn the shell process
        let _child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        // Get writer and reader from master
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get writer: {}", e))?;

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {}", e))?;

        let master = Arc::new(Mutex::new(pair.master));
        let writer = Arc::new(Mutex::new(writer));
        let running = Arc::new(std::sync::atomic::AtomicBool::new(true));

        // Spawn reader thread to stream output to frontend
        let session_id_clone = session_id.clone();
        let running_clone = running.clone();
        let reader_handle = thread::spawn(move || {
            Self::read_output(reader, session_id_clone, running_clone, app);
        });

        Ok(Self {
            session_id,
            writer,
            master,
            _reader_handle: reader_handle,
            running,
        })
    }

    /// Read output from PTY and emit events to frontend
    fn read_output(
        mut reader: Box<dyn Read + Send>,
        session_id: String,
        running: Arc<std::sync::atomic::AtomicBool>,
        app: AppHandle,
    ) {
        let mut buffer = [0u8; 4096];

        loop {
            if !running.load(std::sync::atomic::Ordering::Relaxed) {
                break;
            }

            match reader.read(&mut buffer) {
                Ok(0) => {
                    // EOF - process exited
                    let _ = app.emit(
                        "terminal-exit",
                        TerminalExitPayload {
                            session_id: session_id.clone(),
                            exit_code: Some(0),
                        },
                    );
                    break;
                }
                Ok(n) => {
                    let data = buffer[..n].to_vec();
                    let _ = app.emit(
                        "terminal-output",
                        TerminalOutputPayload {
                            session_id: session_id.clone(),
                            data,
                        },
                    );
                }
                Err(e) => {
                    eprintln!("PTY read error for {}: {}", session_id, e);
                    let _ = app.emit(
                        "terminal-exit",
                        TerminalExitPayload {
                            session_id: session_id.clone(),
                            exit_code: None,
                        },
                    );
                    break;
                }
            }
        }
    }

    /// Write input to the PTY
    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        let mut writer = self.writer.lock();
        writer
            .write_all(data)
            .map_err(|e| format!("Failed to write to PTY: {}", e))?;
        writer
            .flush()
            .map_err(|e| format!("Failed to flush PTY: {}", e))?;
        Ok(())
    }

    /// Resize the PTY
    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        let master = self.master.lock();
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {}", e))?;
        Ok(())
    }

    /// Get the session ID (kept for potential debugging use)
    #[allow(dead_code)]
    pub fn id(&self) -> &str {
        &self.session_id
    }

    /// Close the PTY session
    pub fn close(&self) {
        self.running
            .store(false, std::sync::atomic::Ordering::Relaxed);
        // The reader thread will exit when it detects running=false or gets EOF
    }
}

impl Drop for PtySession {
    fn drop(&mut self) {
        self.close();
    }
}
