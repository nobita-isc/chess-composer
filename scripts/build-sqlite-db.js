#!/usr/bin/env node
/**
 * Build Script: CSV to SQLite Database Generator
 *
 * Converts the Lichess puzzle CSV database to a SQLite database file
 * that can be loaded in the browser using sql.js.
 *
 * Usage: node scripts/build-sqlite-db.js [options]
 * Options:
 *   --input <path>   Input CSV file (default: ./src/database/data/lichess_puzzles.csv)
 *   --output <path>  Output database file (default: ./public/database/puzzles.db)
 *   --limit <n>      Limit number of puzzles (for testing)
 */

import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import Papa from 'papaparse';
import { getCategoryMapping, getThemeMapping } from './theme-mapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_INPUT = path.join(__dirname, '../src/database/data/lichess_puzzles.csv');
const DEFAULT_OUTPUT = path.join(__dirname, '../public/database/puzzles.db');

class DatabaseBuilder {
  constructor(options = {}) {
    this.inputPath = options.input || DEFAULT_INPUT;
    this.outputPath = options.output || DEFAULT_OUTPUT;
    this.limit = options.limit || 0;
    this.db = null;
    this.themeIds = {};
    this.stats = {
      puzzlesProcessed: 0,
      themesLinked: 0,
      unknownThemes: new Set(),
      startTime: null
    };
  }

  async build() {
    console.log('========================================');
    console.log('  Chess Puzzle Database Builder');
    console.log('========================================\n');
    this.stats.startTime = Date.now();

    try {
      // 1. Initialize database
      this.initDatabase();

      // 2. Create schema
      this.createSchema();

      // 3. Seed categories and themes
      this.seedCategoriesAndThemes();

      // 4. Process CSV
      await this.processCsv();

      // 5. Update puzzle counts in themes table
      this.updateThemePuzzleCounts();

      // 6. Create indexes (after data insertion for speed)
      this.createIndexes();

      // 7. Optimize database
      this.optimizeDatabase();

      // 8. Close and report
      this.db.close();
      this.printStats();

    } catch (error) {
      console.error('\n❌ Build failed:', error);
      if (this.db) this.db.close();
      process.exit(1);
    }
  }

  initDatabase() {
    console.log('1. Initializing database...');

    // Ensure output directory exists
    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Remove existing database
    if (fs.existsSync(this.outputPath)) {
      fs.unlinkSync(this.outputPath);
    }

    this.db = new Database(this.outputPath);

    // Enable WAL mode for faster writes during build
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = OFF');
    this.db.pragma('cache_size = -64000'); // 64MB cache

    console.log('   ✓ Database initialized');
  }

  createSchema() {
    console.log('2. Creating schema...');

    this.db.exec(`
      -- Categories table
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        icon TEXT,
        display_order INTEGER DEFAULT 0
      );

      -- Themes table
      CREATE TABLE themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        lichess_tag TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        puzzle_count INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      -- Puzzles table
      CREATE TABLE puzzles (
        id TEXT PRIMARY KEY,
        fen TEXT NOT NULL,
        moves TEXT NOT NULL,
        rating INTEGER NOT NULL,
        rating_deviation INTEGER DEFAULT 0,
        popularity INTEGER DEFAULT 0,
        nb_plays INTEGER DEFAULT 0,
        game_url TEXT,
        opening_tags TEXT
      );

      -- Junction table for many-to-many puzzle-theme relationship
      CREATE TABLE puzzle_themes (
        puzzle_id TEXT NOT NULL,
        theme_id INTEGER NOT NULL,
        PRIMARY KEY (puzzle_id, theme_id),
        FOREIGN KEY (puzzle_id) REFERENCES puzzles(id),
        FOREIGN KEY (theme_id) REFERENCES themes(id)
      );
    `);

    console.log('   ✓ Schema created');
  }

  seedCategoriesAndThemes() {
    console.log('3. Seeding categories and themes...');

    const categories = getCategoryMapping();
    const themes = getThemeMapping();

    // Insert categories
    const insertCategory = this.db.prepare(`
      INSERT INTO categories (name, display_name, icon, display_order)
      VALUES (?, ?, ?, ?)
    `);

    const categoryIds = {};
    let categoryOrder = 1;
    for (const [name, data] of Object.entries(categories)) {
      insertCategory.run(name, data.displayName, data.icon, categoryOrder++);
      categoryIds[name] = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
    }

    console.log(`   ✓ Inserted ${Object.keys(categories).length} categories`);

    // Insert themes
    const insertTheme = this.db.prepare(`
      INSERT INTO themes (category_id, lichess_tag, display_name, description, display_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const [tag, data] of Object.entries(themes)) {
      const categoryId = categoryIds[data.category];
      if (!categoryId) {
        console.warn(`   ⚠ Unknown category '${data.category}' for theme '${tag}'`);
        continue;
      }
      insertTheme.run(categoryId, tag, data.displayName, data.description || '', data.order || 0);
      this.themeIds[tag] = this.db.prepare('SELECT last_insert_rowid() as id').get().id;
    }

    console.log(`   ✓ Inserted ${Object.keys(themes).length} themes`);
  }

  async processCsv() {
    console.log(`4. Processing CSV: ${this.inputPath}`);

    if (!fs.existsSync(this.inputPath)) {
      throw new Error(`Input file not found: ${this.inputPath}`);
    }

    const fileSize = fs.statSync(this.inputPath).size;
    console.log(`   File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    if (this.limit) {
      console.log(`   Limit: ${this.limit} puzzles`);
    }

    // Prepare statements for batch insert
    const insertPuzzle = this.db.prepare(`
      INSERT OR IGNORE INTO puzzles
      (id, fen, moves, rating, rating_deviation, popularity, nb_plays, game_url, opening_tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertThemeLink = this.db.prepare(`
      INSERT OR IGNORE INTO puzzle_themes (puzzle_id, theme_id)
      VALUES (?, ?)
    `);

    // Batch insert transaction
    const insertBatch = this.db.transaction((puzzles) => {
      for (const p of puzzles) {
        insertPuzzle.run(
          p.id, p.fen, p.moves, p.rating, p.ratingDeviation,
          p.popularity, p.nbPlays, p.gameUrl, p.openingTags
        );

        for (const themeId of p.themeIds) {
          insertThemeLink.run(p.id, themeId);
          this.stats.themesLinked++;
        }
      }
    });

    return new Promise((resolve, reject) => {
      const batch = [];
      const BATCH_SIZE = 5000;

      const stream = createReadStream(this.inputPath);

      Papa.parse(stream, {
        header: true,
        skipEmptyLines: true,
        step: (result) => {
          if (this.limit && this.stats.puzzlesProcessed >= this.limit) {
            return;
          }

          const row = result.data;
          if (!row.PuzzleId || !row.FEN || !row.Moves) {
            return; // Skip invalid rows
          }

          // Parse themes and get their IDs
          const themes = (row.Themes || '').split(' ').filter(t => t);
          const themeIds = [];
          for (const themeTag of themes) {
            const tag = themeTag.toLowerCase();
            if (this.themeIds[tag]) {
              themeIds.push(this.themeIds[tag]);
            } else {
              this.stats.unknownThemes.add(tag);
            }
          }

          batch.push({
            id: row.PuzzleId,
            fen: row.FEN,
            moves: row.Moves,
            rating: parseInt(row.Rating) || 1500,
            ratingDeviation: parseInt(row.RatingDeviation) || 0,
            popularity: parseInt(row.Popularity) || 0,
            nbPlays: parseInt(row.NbPlays) || 0,
            gameUrl: row.GameUrl || '',
            openingTags: row.OpeningTags || '',
            themeIds: themeIds
          });

          this.stats.puzzlesProcessed++;

          // Insert batch
          if (batch.length >= BATCH_SIZE) {
            insertBatch(batch);
            batch.length = 0;

            // Progress indicator
            process.stdout.write(`\r   Processed ${this.stats.puzzlesProcessed.toLocaleString()} puzzles...`);
          }
        },
        complete: () => {
          // Insert remaining batch
          if (batch.length > 0) {
            insertBatch(batch);
          }
          console.log(`\r   ✓ Processed ${this.stats.puzzlesProcessed.toLocaleString()} puzzles`);
          resolve();
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  updateThemePuzzleCounts() {
    console.log('5. Updating theme puzzle counts...');

    this.db.exec(`
      UPDATE themes SET puzzle_count = (
        SELECT COUNT(*) FROM puzzle_themes WHERE theme_id = themes.id
      )
    `);

    console.log('   ✓ Theme counts updated');
  }

  createIndexes() {
    console.log('6. Creating indexes...');

    this.db.exec(`
      CREATE INDEX idx_puzzles_rating ON puzzles(rating);
      CREATE INDEX idx_puzzles_popularity ON puzzles(popularity);
      CREATE INDEX idx_puzzles_rating_popularity ON puzzles(rating, popularity DESC);
      CREATE INDEX idx_puzzle_themes_theme ON puzzle_themes(theme_id);
      CREATE INDEX idx_themes_category ON themes(category_id);
    `);

    console.log('   ✓ Indexes created');
  }

  optimizeDatabase() {
    console.log('7. Optimizing database...');

    // Switch back from WAL mode for better portability
    this.db.pragma('journal_mode = DELETE');

    // Run VACUUM to reclaim space and optimize
    this.db.exec('VACUUM');

    // Run ANALYZE for query optimization
    this.db.exec('ANALYZE');

    console.log('   ✓ Database optimized');
  }

  printStats() {
    const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
    const fileSize = fs.statSync(this.outputPath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

    console.log('\n========================================');
    console.log('  BUILD COMPLETE');
    console.log('========================================');
    console.log(`  Puzzles:        ${this.stats.puzzlesProcessed.toLocaleString()}`);
    console.log(`  Theme links:    ${this.stats.themesLinked.toLocaleString()}`);
    console.log(`  Build time:     ${elapsed}s`);
    console.log(`  Output file:    ${this.outputPath}`);
    console.log(`  Database size:  ${fileSizeMB} MB`);

    if (this.stats.unknownThemes.size > 0) {
      console.log(`\n  Unknown themes (${this.stats.unknownThemes.size}):`);
      const unknownList = Array.from(this.stats.unknownThemes).slice(0, 10);
      for (const t of unknownList) {
        console.log(`    - ${t}`);
      }
      if (this.stats.unknownThemes.size > 10) {
        console.log(`    ... and ${this.stats.unknownThemes.size - 10} more`);
      }
    }

    console.log('========================================\n');
  }
}

// CLI Argument Parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' && args[i + 1]) {
      options.input = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[++i]);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/build-sqlite-db.js [options]

Options:
  --input <path>   Input CSV file (default: ./src/database/data/lichess_puzzles.csv)
  --output <path>  Output database file (default: ./public/database/puzzles.db)
  --limit <n>      Limit number of puzzles (for testing)
  --help, -h       Show this help message
      `);
      process.exit(0);
    }
  }

  return options;
}

// Main
const options = parseArgs();
const builder = new DatabaseBuilder(options);
builder.build();
