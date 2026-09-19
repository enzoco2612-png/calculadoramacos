//! History repository — sole SQLite access point (SPEC §6–7).

use rusqlite::Connection;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct Calculation {
    pub id: i64,
    pub expression: String,
    pub result: String,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub enum DbError {
    Sqlite(String),
    Io(String),
    Unavailable,
}

impl std::fmt::Display for DbError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DbError::Sqlite(msg) => write!(f, "sqlite: {msg}"),
            DbError::Io(msg) => write!(f, "io: {msg}"),
            DbError::Unavailable => write!(f, "database unavailable"),
        }
    }
}

impl std::error::Error for DbError {}

pub struct Repository {
    pub(crate) conn: Connection,
}

impl Repository {
    pub fn open(path: &std::path::Path) -> Result<Self, DbError> {
        let conn = crate::db::open_and_migrate(path)?;
        Ok(Self { conn })
    }

    /// Inserts a completed calculation. `created_at` is ISO-8601 UTC.
    pub fn insert(
        &self,
        expression: &str,
        result: &str,
        created_at: &str,
    ) -> Result<i64, DbError> {
        self.conn
            .execute(
                "INSERT INTO calculations (expression, result, created_at) VALUES (?1, ?2, ?3)",
                (expression, result, created_at),
            )
            .map_err(|e| DbError::Sqlite(e.to_string()))?;
        Ok(self.conn.last_insert_rowid())
    }

    /// Lists calculations ordered by `created_at DESC`.
    pub fn list(&self) -> Result<Vec<Calculation>, DbError> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, expression, result, created_at
                 FROM calculations
                 ORDER BY created_at DESC, id DESC",
            )
            .map_err(|e| DbError::Sqlite(e.to_string()))?;

        let rows = stmt
            .query_map([], |row| {
                Ok(Calculation {
                    id: row.get(0)?,
                    expression: row.get(1)?,
                    result: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })
            .map_err(|e| DbError::Sqlite(e.to_string()))?;

        let mut out = Vec::new();
        for row in rows {
            out.push(row.map_err(|e| DbError::Sqlite(e.to_string()))?);
        }
        Ok(out)
    }

    pub fn clear(&self) -> Result<(), DbError> {
        self.conn
            .execute("DELETE FROM calculations", [])
            .map_err(|e| DbError::Sqlite(e.to_string()))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn with_repo(f: impl FnOnce(&Repository)) {
        let dir = tempdir().unwrap();
        let path = dir.path().join("repo.db");
        let repo = Repository::open(&path).unwrap();
        f(&repo);
    }

    #[test]
    fn insert_and_list_ordered_by_created_at_desc() {
        with_repo(|repo| {
            repo.insert("1+1", "2", "2024-01-01T00:00:00Z").unwrap();
            repo.insert("2+2", "4", "2024-01-02T00:00:00Z").unwrap();
            repo.insert("3+3", "6", "2024-01-03T00:00:00Z").unwrap();

            let list = repo.list().unwrap();
            assert_eq!(list.len(), 3);
            assert_eq!(list[0].expression, "3+3");
            assert_eq!(list[1].expression, "2+2");
            assert_eq!(list[2].expression, "1+1");
            assert_eq!(list[0].result, "6");
        });
    }

    #[test]
    fn clear_removes_all_rows() {
        with_repo(|repo| {
            repo.insert("5×5", "25", "2024-01-01T00:00:00Z").unwrap();
            repo.clear().unwrap();
            assert!(repo.list().unwrap().is_empty());
        });
    }

    #[test]
    fn insert_failure_returns_err_without_panic() {
        with_repo(|repo| {
            repo.conn.execute("DROP TABLE calculations", []).unwrap();
            let err = repo.insert("1+1", "2", "2024-01-01T00:00:00Z");
            assert!(err.is_err());
            let _ = err.map_err(|e| e.to_string());
        });
    }
}
