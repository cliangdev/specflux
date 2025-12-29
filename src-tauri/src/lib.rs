mod commands;
mod pty;

use commands::terminal::*;
use pty::PtyState;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Manager,
};
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
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(PtyState::new())
        .setup(|app| {
            // Create Edit menu with standard shortcuts (Cmd on Mac, Ctrl on Windows/Linux)
            let undo = PredefinedMenuItem::undo(app, Some("Undo"))?;
            let redo = PredefinedMenuItem::redo(app, Some("Redo"))?;
            let cut = PredefinedMenuItem::cut(app, Some("Cut"))?;
            let copy = PredefinedMenuItem::copy(app, Some("Copy"))?;
            let paste = PredefinedMenuItem::paste(app, Some("Paste"))?;
            let select_all = PredefinedMenuItem::select_all(app, Some("Select All"))?;
            let separator1 = PredefinedMenuItem::separator(app)?;
            let separator2 = PredefinedMenuItem::separator(app)?;

            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[&undo, &redo, &separator1, &cut, &copy, &paste, &separator2, &select_all],
            )?;

            // Create Navigation menu with Back option
            let back_item = MenuItem::with_id(app, "back", "Back", true, Some("CmdOrCtrl+["))?;
            let forward_item =
                MenuItem::with_id(app, "forward", "Forward", true, Some("CmdOrCtrl+]"))?;

            let navigation_menu = Submenu::with_items(
                app,
                "Navigation",
                true,
                &[&back_item, &forward_item],
            )?;

            let menu = Menu::with_items(app, &[&edit_menu, &navigation_menu])?;
            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(move |app_handle, event| {
                if event.id() == "back" {
                    // Emit event to webview to go back
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.eval("history.back()");
                    }
                } else if event.id() == "forward" {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.eval("history.forward()");
                    }
                }
            });

            Ok(())
        })
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
