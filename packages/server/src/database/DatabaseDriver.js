/**
 * DatabaseDriver.js
 * Factory for creating database driver instances.
 * Driver is selected by config.driver ('sqlite' | 'postgres').
 *
 * @typedef {object} DatabaseDriver
 * @property {(sql: string, params?: any[]) => Promise<object[]>} query
 * @property {(sql: string, params?: any[]) => Promise<object|null>} queryOne
 * @property {(sql: string, params?: any[]) => Promise<any>} queryScalar
 * @property {(sql: string, params?: any[]) => Promise<{ changes: number, lastInsertId: number|null }>} run
 * @property {(sql: string) => Promise<void>} exec
 * @property {(fn: (driver: DatabaseDriver) => Promise<any>) => Promise<any>} transaction
 * @property {() => Promise<void>} close
 */

import { SqliteDriver } from './drivers/sqlite-driver.js';
import { PostgresDriver } from './drivers/postgres-driver.js';

/**
 * Create and connect a driver from the given config.
 * @param {{ driver: 'sqlite'|'postgres', sqlitePath?: string|null, databaseUrl?: string|null }} config
 * @returns {Promise<DatabaseDriver>}
 */
export async function createDriver(config) {
  if (config.driver === 'postgres') {
    const driver = new PostgresDriver();
    await driver.connect(config);
    return driver;
  }

  // Default: sqlite
  const driver = new SqliteDriver();
  await driver.connect(config);
  return driver;
}
