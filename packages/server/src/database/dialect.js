/**
 * dialect.js
 * Per-driver SQL fragment helpers for schema portability.
 * Supports: 'sqlite' (default) | 'postgres'
 */

const DIALECTS = {
  sqlite: {
    /**
     * Auto-increment integer primary key declaration.
     * @returns {string}
     */
    autoIncrementPk() {
      return 'INTEGER PRIMARY KEY AUTOINCREMENT';
    },

    /**
     * Build an upsert statement using ON CONFLICT (supported since SQLite 3.24+).
     * @param {{ table: string, columns: string[], conflictCols: string[], updateCols: string[] }} opts
     * @returns {string} SQL string with ? placeholders
     */
    upsert({ table, columns, conflictCols, updateCols }) {
      const cols = columns.join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const conflict = conflictCols.join(', ');
      const updates = updateCols.map(c => `${c} = excluded.${c}`).join(', ');
      return `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO UPDATE SET ${updates}`;
    }
  },

  postgres: {
    autoIncrementPk() {
      return 'BIGSERIAL PRIMARY KEY';
    },

    upsert({ table, columns, conflictCols, updateCols }) {
      const cols = columns.join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const conflict = conflictCols.join(', ');
      const updates = updateCols.map(c => `${c} = EXCLUDED.${c}`).join(', ');
      return `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO UPDATE SET ${updates}`;
    }
  }
};

/**
 * Get dialect helper by driver name.
 * @param {'sqlite'|'postgres'} driverName
 * @returns {{ autoIncrementPk(): string, upsert(opts): string }}
 */
export function getDialect(driverName) {
  return DIALECTS[driverName] || DIALECTS.sqlite;
}

/**
 * Get dialect from a db instance (reads db.driver?.constructor?.name or db.driverName).
 * Falls back to 'sqlite' when no driver is set.
 * @param {object} db
 * @returns {{ autoIncrementPk(): string, upsert(opts): string }}
 */
export function getDialectForDb(db) {
  const name = db.driverName
    || (db.driver ? 'postgres' : 'sqlite');
  return getDialect(name);
}
