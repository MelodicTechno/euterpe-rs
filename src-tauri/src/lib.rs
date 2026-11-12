mod commands;

use std::path::Path;
use tauri::ipc::Response;

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Response, String> {
    commands::read_file_bytes(Path::new(&path)).map(Response::new)
}

#[tauri::command]
fn write_text_atomic(path: String, contents: String) -> Result<(), String> {
    commands::write_text_atomic(Path::new(&path), &contents)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            read_file_bytes,
            write_text_atomic
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
