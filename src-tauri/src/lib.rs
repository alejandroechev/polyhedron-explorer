//! Tauri shell for the Polyhedron Explorer.
//!
//! All geometry and UI live in the web layer so that the desktop, Android and
//! browser builds stay identical. This crate only hosts the webview and is the
//! place to add native capabilities later (file export, printing nets, ...).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running polyhedron explorer");
}
