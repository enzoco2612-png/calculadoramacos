//! SQLite open + migrations (SPEC §7).

use std::path::Path;

use rusqlite::Connection;

use crate::repository::DbError;

const MIGRATION_001: &str = include_str!("../migrations/001_init.sql");
const MIGRATION_001_VERSION: i32 = 1;

/// Opens (or creates) the SQLite database at `path`.
pub fn open(path: &Path) -> Result<Connection, DbError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| DbError::Io(e.to_string()))?;
    }
    Connection::open(path).map_err(|e| DbError::Sqlite(e.to_string()))
}

/// Applies pending migrations. Safe to call on every app start.
pub fn migrate(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY
        );",
    )
    .map_err(|e| DbError::Sqlite(e.to_string()))?;

    let applied: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = ?1",
            [MIGRATION_001_VERSION],
            |row| row.get(0),
        )
        .map_err(|e| DbError::Sqlite(e.to_string()))?;

    if applied == 0 {
        conn.execute_batch(MIGRATION_001)
            .map_err(|e| DbError::Sqlite(e.to_string()))?;
        conn.execute(
            "INSERT INTO schema_migrations (version) VALUES (?1)",
            [MIGRATION_001_VERSION],
        )
        .map_err(|e| DbError::Sqlite(e.to_string()))?;
    }

    Ok(())
}

/// Opens the database and runs migrations.
pub fn open_and_migrate(path: &Path) -> Result<Connection, DbError> {
    let conn = open(path)?;
    migrate(&conn)?;
    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn migrate_creates_calculations_and_schema_migrations() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("test.db");
        let conn = open_and_migrate(&path).unwrap();

        let tables: Vec<String> = {
            let mut stmt = conn
                .prepare(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
                )
                .unwrap();
            stmt.query_map([], |row| row.get(0))
                .unwrap()
                .map(|r| r.unwrap())
                .collect()
        };

        assert!(tables.contains(&"calculations".to_string()));
        assert!(tables.contains(&"schema_migrations".to_string()));

        let version: i32 = conn
            .query_row(
                "SELECT version FROM schema_migrations WHERE version = 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(version, 1);

        let index_count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_calculations_created_at'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(index_count, 1);
    }

    #[test]
    fn migrate_is_idempotent() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("test.db");
        let conn = open_and_migrate(&path).unwrap();
        migrate(&conn).unwrap();
        migrate(&conn).unwrap();

        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 1);
    }
}
