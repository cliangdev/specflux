mod commands;
mod pty;

use commands::terminal::*;
use pty::PtyState;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
async fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(PtyState::new())
        .invoke_handler(tauri::generate_handler![
            open_url,
            spawn_terminal,
            terminal_write,
            terminal_resize,
            terminal_close,
            list_terminal_sessions,
            has_terminal_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
