/**
 * param-adapter.js
 * Converts SQLite-style `?` placeholders to Postgres `$N` notation.
 * Skips `?` inside single-quoted string literals (handles `''` escape).
 */

/**
 * Walk SQL string, replacing `?` outside string literals with $1, $2, ...
 * Rules:
 *  - Enter string: single quote `'`
 *  - Exit string: single quote not followed by another single quote (`''` = escaped quote, stay in string)
 *  - `?` inside string → kept as-is
 *  - `?` outside string → replaced with `$N` (N increments from 1)
 *
 * @param {string} sql - SQL with `?` placeholders
 * @returns {{ sql: string, count: number }} pgSql and number of params replaced
 */
export function adaptParams(sql) {
  let result = '';
  let count = 0;
  let inString = false;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (inString) {
      if (ch === "'") {
        // Check for escaped quote `''`
        if (i + 1 < sql.length && sql[i + 1] === "'") {
          result += "''";
          i += 2;
          continue;
        }
        // End of string
        inString = false;
        result += ch;
        i++;
      } else {
        result += ch;
        i++;
      }
    } else {
      if (ch === "'") {
        inString = true;
        result += ch;
        i++;
      } else if (ch === '?') {
        count++;
        result += `$${count}`;
        i++;
      } else {
        result += ch;
        i++;
      }
    }
  }

  return { sql: result, count };
}
