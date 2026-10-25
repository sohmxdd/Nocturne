// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::File;
use std::io::Read;
use sha2::{Digest, Sha256};

#[tauri::command]
fn compute_file_fingerprint(file_path: String) -> Result<String, String> {
    let mut file = File::open(&file_path).map_err(|e| e.to_string())?;
    let mut buffer = [0u8; 65536]; // Read first 64 KB
    let bytes_read = file.read(&mut buffer).map_err(|e| e.to_string())?;

    let mut hasher = Sha256::new();
    hasher.update(&buffer[..bytes_read]);
    let result = hasher.finalize();
    Ok(hex::encode(result))
}

#[tauri::command]
fn read_file_binary(file_path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&file_path).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            compute_file_fingerprint,
            read_file_binary
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nocturne Tauri application");
}
