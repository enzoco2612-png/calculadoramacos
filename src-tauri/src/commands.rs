//! Tauri IPC commands for history (SPEC §6).

use std::sync::Mutex;

use chrono::Utc;
use tauri::State;

use crate::repository::{Calculation, DbError, Repository};

pub struct DbState(pub Mutex<Option<Repository>>);

fn with_repo<T>(
    state: &DbState,
    f: impl FnOnce(&Repository) -> Result<T, DbError>,
) -> Result<T, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    match guard.as_ref() {
        Some(repo) => f(repo).map_err(|e| e.to_string()),
        None => Err(DbError::Unavailable.to_string()),
    }
}

#[tauri::command]
pub fn history_insert(
    state: State<'_, DbState>,
    expression: String,
    result: String,
) -> Result<i64, String> {
    let created_at = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    with_repo(&state, |repo| repo.insert(&expression, &result, &created_at))
}

#[tauri::command]
pub fn history_list(state: State<'_, DbState>) -> Result<Vec<Calculation>, String> {
    with_repo(&state, |repo| repo.list())
}

#[tauri::command]
pub fn history_clear(state: State<'_, DbState>) -> Result<(), String> {
    with_repo(&state, |repo| repo.clear())
}

/// Initializes DB state without panicking on failure (SPEC §7).
pub fn init_db_state(app_data_dir: &std::path::Path) -> DbState {
    let db_path = app_data_dir.join("calculations.db");
    match Repository::open(&db_path) {
        Ok(repo) => {
            eprintln!("[history] SQLite ready at {}", db_path.display());
            DbState(Mutex::new(Some(repo)))
        }
        Err(err) => {
            eprintln!("[history] SQLite init failed (calculator continues): {err}");
            DbState(Mutex::new(None))
        }
    }
}
