/**
 * database-config.js
 * Reads DATABASE_DRIVER, DATABASE_URL, SQLITE_PATH from env.
 * Returns a validated config object for driver factory.
 */

/**
 * Replaces the password component in a postgres URL with ***.
 * Safe to log.
 * @param {string} url
 * @returns {string}
 */
export function redactUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.password) {
      u.password = '***';
    }
    return u.toString();
  } catch {
    // Not a valid URL — redact anything after the @ if present
    return url.replace(/:([^@]+)@/, ':***@');
  }
}

/**
 * Build and validate database config from environment.
 * @returns {{ driver: 'sqlite'|'postgres', sqlitePath: string|null, databaseUrl: string|null }}
 * @throws {Error} if driver=postgres and DATABASE_URL is missing
 */
export function getDatabaseConfig() {
  const driver = (process.env.DATABASE_DRIVER || 'sqlite').toLowerCase();

  if (driver !== 'sqlite' && driver !== 'postgres') {
    throw new Error(`Unsupported DATABASE_DRIVER: "${driver}". Must be "sqlite" or "postgres".`);
  }

  const databaseUrl = process.env.DATABASE_URL || null;
  const sqlitePath = process.env.SQLITE_PATH || null;

  if (driver === 'postgres' && !databaseUrl) {
    throw new Error('DATABASE_URL is required when DATABASE_DRIVER=postgres');
  }

  return { driver, sqlitePath, databaseUrl };
}
