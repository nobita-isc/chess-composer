#!/usr/bin/env node

/**
 * Filter Lichess Puzzle Database
 *
 * Takes the full Lichess puzzle database and filters it for our supported themes
 * Usage: node scripts/filter-lichess-puzzles.js <input-csv-path> [output-path]
 *
 * Example:
 *   node scripts/filter-lichess-puzzles.js lichess_db_puzzle.csv
 *   node scripts/filter-lichess-puzzles.js lichess_db_puzzle.csv src/database/data/lichess_puzzles_full.csv
 */

import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Themes we want to filter for
const TARGET_THEMES = [
  'backRankMate',
  'smotheredMate',
  'anastasiaMate',
  'arabianMate',
  'doubleBishopMate',
  'dovetailMate',
  'hangingPiece',
  'mate',
  'mateIn1',
  'mateIn2',
  'endgame'
];

// Quality filters
const MIN_RATING = 1000;
const MAX_RATING = 2500;
const MIN_POPULARITY = 80;
const MIN_PLAYS = 100;

// Parse command line arguments
const inputFile = process.argv[2];
const outputFile = process.argv[3] || path.join(__dirname, '../src/database/data/lichess_puzzles_filtered.csv');

if (!inputFile) {
  console.error('❌ Error: Input file path required');
  console.log('\nUsage:');
  console.log('  node scripts/filter-lichess-puzzles.js <input-csv> [output-csv]');
  console.log('\nExample:');
  console.log('  node scripts/filter-lichess-puzzles.js lichess_db_puzzle.csv');
  console.log('  node scripts/filter-lichess-puzzles.js lichess_db_puzzle.csv custom_output.csv');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log('🔍 Filtering Lichess Puzzle Database\n');
console.log(`Input:  ${inputFile}`);
console.log(`Output: ${outputFile}\n`);

console.log('📋 Filter Criteria:');
console.log(`  - Themes: ${TARGET_THEMES.join(', ')}`);
console.log(`  - Rating: ${MIN_RATING} - ${MAX_RATING}`);
console.log(`  - Popularity: ≥ ${MIN_POPULARITY}%`);
console.log(`  - Plays: ≥ ${MIN_PLAYS}\n`);

// Statistics
let totalLines = 0;
let filteredLines = 0;
const themeCount = {};

// Create write stream for output
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const writeStream = fs.createWriteStream(outputFile);

// Process the CSV line by line (memory efficient for large files)
const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity
});

let isFirstLine = true;
let headerWritten = false;

rl.on('line', (line) => {
  totalLines++;

  // Write header
  if (isFirstLine) {
    writeStream.write(line + '\n');
    headerWritten = true;
    isFirstLine = false;
    return;
  }

  // Show progress
  if (totalLines % 100000 === 0) {
    console.log(`📊 Processed ${totalLines.toLocaleString()} lines, kept ${filteredLines.toLocaleString()}`);
  }

  // Parse CSV line (simple parsing, assumes no commas in fields)
  const fields = line.split(',');

  if (fields.length < 8) {
    return; // Skip malformed lines
  }

  const puzzleId = fields[0];
  const fen = fields[1];
  const moves = fields[2];
  const rating = parseInt(fields[3]) || 0;
  const ratingDev = parseInt(fields[4]) || 0;
  const popularity = parseInt(fields[5]) || 0;
  const nbPlays = parseInt(fields[6]) || 0;
  const themes = fields[7] || '';
  const gameUrl = fields[8] || '';

  // Apply filters
  if (rating < MIN_RATING || rating > MAX_RATING) return;
  if (popularity < MIN_POPULARITY) return;
  if (nbPlays < MIN_PLAYS) return;

  // Check if puzzle has any of our target themes
  const puzzleThemes = themes.toLowerCase().split(' ');
  const hasTargetTheme = puzzleThemes.some(theme =>
    TARGET_THEMES.some(target => theme.includes(target.toLowerCase()))
  );

  if (!hasTargetTheme) return;

  // Count themes
  puzzleThemes.forEach(theme => {
    if (TARGET_THEMES.some(target => theme.includes(target.toLowerCase()))) {
      themeCount[theme] = (themeCount[theme] || 0) + 1;
    }
  });

  // Write to output
  writeStream.write(line + '\n');
  filteredLines++;
});

rl.on('close', () => {
  writeStream.end();

  console.log('\n✅ Filtering Complete!\n');
  console.log('📊 Statistics:');
  console.log(`  Total puzzles processed: ${totalLines.toLocaleString()}`);
  console.log(`  Puzzles kept: ${filteredLines.toLocaleString()}`);
  console.log(`  Reduction: ${((1 - filteredLines / totalLines) * 100).toFixed(1)}%`);

  const fileSizeKB = fs.statSync(outputFile).size / 1024;
  const fileSizeMB = fileSizeKB / 1024;
  console.log(`  Output file size: ${fileSizeMB > 1 ? fileSizeMB.toFixed(2) + ' MB' : fileSizeKB.toFixed(2) + ' KB'}`);

  console.log('\n🎯 Themes Found:');
  const sortedThemes = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // Top 20 themes

  sortedThemes.forEach(([theme, count]) => {
    console.log(`  ${theme.padEnd(25)} ${count.toLocaleString()}`);
  });

  console.log(`\n✨ Filtered database saved to: ${outputFile}`);
  console.log('\n💡 To use this database in your app:');
  console.log(`   1. Copy to: src/database/data/lichess_puzzles.csv`);
  console.log(`   2. Or update the path in DatabaseGenerator.initialize()`);
});

rl.on('error', (error) => {
  console.error('❌ Error reading file:', error);
  process.exit(1);
});

console.log('🚀 Starting to process file...\n');
