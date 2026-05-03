/**
 * table-manifest.js
 * Hand-curated list of all application tables with dependency ordering.
 * Used by migrate-to-postgres CLI to determine copy order and validate completeness.
 *
 * Dependency rule: a table's deps must be copied before the table itself.
 * puzzle_reports uses BIGSERIAL PK — sequence must be reset after copy.
 * schema_migrations is intentionally excluded: handled by migration-runner.
 */

/** @type {Array<{ name: string, pk: string[], deps: string[], hasSerialPk: boolean }>} */
const MANIFEST = [
  // Standalone — no FK deps
  { name: 'puzzles',               pk: ['id'],         deps: [],                                    hasSerialPk: false },
  { name: 'students',              pk: ['id'],         deps: [],                                    hasSerialPk: false },
  { name: 'courses',               pk: ['id'],         deps: [],                                    hasSerialPk: false },
  { name: 'weekly_exercises',      pk: ['id'],         deps: [],                                    hasSerialPk: false },

  // Single-level deps
  { name: 'users',                 pk: ['id'],         deps: ['students'],                          hasSerialPk: false },
  { name: 'lessons',               pk: ['id'],         deps: ['courses'],                           hasSerialPk: false },
  { name: 'puzzle_modifications',  pk: ['puzzle_id'],  deps: [],                                    hasSerialPk: false },

  // Two-level deps
  { name: 'lesson_content',        pk: ['id'],         deps: ['lessons'],                           hasSerialPk: false },
  { name: 'course_assignments',    pk: ['id'],         deps: ['courses', 'students'],               hasSerialPk: false },
  { name: 'student_gamification',  pk: ['student_id'], deps: ['students'],                          hasSerialPk: false },
  { name: 'student_exercises',     pk: ['id'],         deps: ['students', 'weekly_exercises'],      hasSerialPk: false },

  // Three-level deps
  { name: 'lesson_progress',       pk: ['id'],         deps: ['students', 'lesson_content'],        hasSerialPk: false },

  // BIGSERIAL PK — sequence reset required after copy
  { name: 'puzzle_reports',        pk: ['id'],         deps: [],                                    hasSerialPk: true },
];

/**
 * Topological sort: tables with no unresolved deps come first.
 * Throws if a cycle or missing dep is detected.
 * @param {typeof MANIFEST} tables
 * @returns {typeof MANIFEST}
 */
function topoSort(tables) {
  const byName = new Map(tables.map(t => [t.name, t]));
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(name) {
    if (visited.has(name)) return;
    if (visiting.has(name)) throw new Error(`Circular dependency detected involving table: ${name}`);
    const t = byName.get(name);
    if (!t) throw new Error(`Dependency references unknown table: ${name}`);
    visiting.add(name);
    for (const dep of t.deps) visit(dep);
    visiting.delete(name);
    visited.add(name);
    sorted.push(t);
  }

  for (const t of tables) visit(t.name);
  return sorted;
}

/**
 * Returns tables in safe copy order (deps before dependents).
 * @returns {typeof MANIFEST}
 */
export function getOrderedTables() {
  return topoSort(MANIFEST);
}

/**
 * Returns all tables that have a BIGSERIAL / serial PK needing sequence reset.
 * @returns {typeof MANIFEST}
 */
export function getSerialPkTables() {
  return MANIFEST.filter(t => t.hasSerialPk);
}

/**
 * Find a single table entry by name. Returns undefined if not found.
 * @param {string} name
 * @returns {object|undefined}
 */
export function getTable(name) {
  return MANIFEST.find(t => t.name === name);
}

/**
 * Assert that every table in the SQLite database is present in the manifest.
 * Warns to stderr for any table not listed (excludes schema_migrations).
 * @param {import('better-sqlite3').Database} sqliteRawDb
 */
export function assertCompleteness(sqliteRawDb) {
  const EXCLUDED = new Set(['schema_migrations']);
  const knownNames = new Set(MANIFEST.map(t => t.name));
  const rows = sqliteRawDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all();

  for (const { name } of rows) {
    if (EXCLUDED.has(name)) continue;
    if (!knownNames.has(name)) {
      process.stderr.write(`WARNING: table "${name}" exists in SQLite but is not in the migration manifest — it will be SKIPPED.\n`);
    }
  }
}
