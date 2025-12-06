//! PTY (Pseudo-Terminal) Module
//!
//! Provides native terminal support for the Tauri application.
//! Uses portable-pty for cross-platform PTY handling.

pub mod manager;
pub mod session;

pub use manager::PtyState;
