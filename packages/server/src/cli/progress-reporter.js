/**
 * progress-reporter.js
 * Writes copy progress to stderr using carriage-return overwrite.
 * Keeps stdout clean for machine-parseable summary output.
 */

/**
 * Report progress mid-copy. Overwrites current line via \r.
 * @param {string} table
 * @param {number} done - rows copied so far
 * @param {number} total - total rows in source table
 */
export function report(table, done, total) {
  const pct = total > 0 ? Math.floor((done / total) * 100) : 0;
  process.stderr.write(`\r  [${table}] copied ${done}/${total} (${pct}%)`);
}

/**
 * Print final result for a table, advancing to a new line.
 * @param {string} table
 * @param {number} inserted - rows actually inserted (ON CONFLICT DO NOTHING may reduce this)
 * @param {number} total - total rows in source
 */
export function complete(table, inserted, total) {
  process.stderr.write(`\r  [${table}] done — ${inserted} inserted, ${total} source rows\n`);
}

/**
 * Print a plain status message to stderr (newline included).
 * @param {string} msg
 */
export function info(msg) {
  process.stderr.write(`${msg}\n`);
}
