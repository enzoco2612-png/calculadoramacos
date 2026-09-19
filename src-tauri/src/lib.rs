mod commands;
mod db;
mod repository;

use commands::{history_clear, history_insert, history_list, init_db_state};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir().join("calculadora-mac"));
            let _ = std::fs::create_dir_all(&app_data);
            let db_state = init_db_state(&app_data);
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            history_insert,
            history_list,
            history_clear
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod integration_tests {
    use super::repository::Repository;
    use tempfile::tempdir;

    #[test]
    fn completed_calculation_persists_via_repository() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("calc.db");
        let repo = Repository::open(&path).unwrap();

        // Simulate History Service → Repository after successful `=`
        let expression = "427+379";
        let result = "806";
        let created_at = "2024-06-01T12:00:00Z";
        repo.insert(expression, result, created_at).unwrap();

        let list = repo.list().unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].expression, "427+379");
        assert_eq!(list[0].result, "806");
        assert_eq!(list[0].created_at, created_at);
    }

    #[test]
    fn sqlite_open_failure_does_not_panic_init() {
        // Unwritable path → init_db_state returns unavailable state
        let bad = std::path::Path::new("/proc/does-not-exist-for-db/calculations.db");
        let state = super::commands::init_db_state(
            bad.parent().unwrap_or(std::path::Path::new("/proc")),
        );
        let guard = state.0.lock().unwrap();
        // May be None (failed) — must not panic either way on Linux /proc quirks
        let _ = guard.as_ref();
    }
}
