#!/usr/bin/env node
/**
 * Build Script: CSV to SQLite Database Generator (OPTIMIZED VERSION)
 *
 * This version stores themes as a TEXT field instead of a junction table,
 * resulting in a much smaller database file suitable for browser loading.
 *
 * Usage: node scripts/build-sqlite-db-optimized.js [options]
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
    this.themeCounts = {};  // Track puzzle counts per theme
    this.stats = {
      puzzlesProcessed: 0,
      startTime: null
    };
  }

  async build() {
    console.log('========================================');
    console.log('  Chess Puzzle Database Builder (Optimized)');
    console.log('========================================\n');
    this.stats.startTime = Date.now();

    try {
      // 1. Initialize database
      this.initDatabase();

      // 2. Create schema (simplified - no junction table)
      this.createSchema();

      // 3. Seed categories and themes
      this.seedCategoriesAndThemes();

      // 4. Process CSV
      await this.processCsv();

      // 5. Update puzzle counts in themes table
      this.updateThemePuzzleCounts();

      // 6. Create indexes
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

    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (fs.existsSync(this.outputPath)) {
      fs.unlinkSync(this.outputPath);
    }

    this.db = new Database(this.outputPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = OFF');
    this.db.pragma('cache_size = -64000');

    console.log('   ✓ Database initialized');
  }

  createSchema() {
    console.log('2. Creating schema (optimized)...');

    this.db.exec(`
      -- Categories table
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        icon TEXT,
        display_order INTEGER DEFAULT 0
      );

      -- Themes table (for UI display and metadata)
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

      -- Puzzles table (themes stored as comma-separated text for smaller size)
      CREATE TABLE puzzles (
        id TEXT PRIMARY KEY,
        fen TEXT NOT NULL,
        moves TEXT NOT NULL,
        rating INTEGER NOT NULL,
        rating_deviation INTEGER DEFAULT 0,
        popularity INTEGER DEFAULT 0,
        nb_plays INTEGER DEFAULT 0,
        themes TEXT NOT NULL,          -- Comma-separated theme tags
        game_url TEXT,
        opening_tags TEXT
      );
    `);

    console.log('   ✓ Schema created (optimized - no junction table)');
  }

  seedCategoriesAndThemes() {
    console.log('3. Seeding categories and themes...');

    const categories = getCategoryMapping();
    const themes = getThemeMapping();

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

    const insertTheme = this.db.prepare(`
      INSERT INTO themes (category_id, lichess_tag, display_name, description, display_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const [tag, data] of Object.entries(themes)) {
      const categoryId = categoryIds[data.category];
      if (!categoryId) continue;
      insertTheme.run(categoryId, tag, data.displayName, data.description || '', data.order || 0);
      this.themeCounts[tag] = 0;
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

    const insertPuzzle = this.db.prepare(`
      INSERT OR IGNORE INTO puzzles
      (id, fen, moves, rating, rating_deviation, popularity, nb_plays, themes, game_url, opening_tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertBatch = this.db.transaction((puzzles) => {
      for (const p of puzzles) {
        insertPuzzle.run(
          p.id, p.fen, p.moves, p.rating, p.ratingDeviation,
          p.popularity, p.nbPlays, p.themes, p.gameUrl, p.openingTags
        );

        // Count themes for later update
        for (const theme of p.themesList) {
          if (this.themeCounts[theme] !== undefined) {
            this.themeCounts[theme]++;
          }
        }
      }
    });

    return new Promise((resolve, reject) => {
      const batch = [];
      const BATCH_SIZE = 10000;

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
            return;
          }

          const themesRaw = (row.Themes || '').trim();
          const themesList = themesRaw.split(' ').filter(t => t).map(t => t.toLowerCase());

          batch.push({
            id: row.PuzzleId,
            fen: row.FEN,
            moves: row.Moves,
            rating: parseInt(row.Rating) || 1500,
            ratingDeviation: parseInt(row.RatingDeviation) || 0,
            popularity: parseInt(row.Popularity) || 0,
            nbPlays: parseInt(row.NbPlays) || 0,
            themes: themesList.join(','),  // Store as comma-separated
            themesList: themesList,  // For counting
            gameUrl: row.GameUrl || '',
            openingTags: row.OpeningTags || ''
          });

          this.stats.puzzlesProcessed++;

          if (batch.length >= BATCH_SIZE) {
            insertBatch(batch);
            batch.length = 0;
            process.stdout.write(`\r   Processed ${this.stats.puzzlesProcessed.toLocaleString()} puzzles...`);
          }
        },
        complete: () => {
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

    const updateTheme = this.db.prepare(`
      UPDATE themes SET puzzle_count = ? WHERE lichess_tag = ?
    `);

    for (const [tag, count] of Object.entries(this.themeCounts)) {
      if (count > 0) {
        updateTheme.run(count, tag);
      }
    }

    console.log('   ✓ Theme counts updated');
  }

  createIndexes() {
    console.log('6. Creating indexes...');

    this.db.exec(`
      CREATE INDEX idx_puzzles_rating ON puzzles(rating);
      CREATE INDEX idx_puzzles_popularity ON puzzles(popularity);
      CREATE INDEX idx_puzzles_rating_popularity ON puzzles(rating, popularity DESC);
      CREATE INDEX idx_themes_category ON themes(category_id);
    `);

    console.log('   ✓ Indexes created');
  }

  optimizeDatabase() {
    console.log('7. Optimizing database...');

    this.db.pragma('journal_mode = DELETE');
    this.db.exec('VACUUM');
    this.db.exec('ANALYZE');

    console.log('   ✓ Database optimized');
  }

  printStats() {
    const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
    const fileSize = fs.statSync(this.outputPath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

    console.log('\n========================================');
    console.log('  BUILD COMPLETE (Optimized)');
    console.log('========================================');
    console.log(`  Puzzles:        ${this.stats.puzzlesProcessed.toLocaleString()}`);
    console.log(`  Build time:     ${elapsed}s`);
    console.log(`  Output file:    ${this.outputPath}`);
    console.log(`  Database size:  ${fileSizeMB} MB`);
    console.log('========================================\n');
  }
}

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
Usage: node scripts/build-sqlite-db-optimized.js [options]

Options:
  --input <path>   Input CSV file
  --output <path>  Output database file
  --limit <n>      Limit number of puzzles
  --help, -h       Show this help message
      `);
      process.exit(0);
    }
  }

  return options;
}

const options = parseArgs();
const builder = new DatabaseBuilder(options);
builder.build();
