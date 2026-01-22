# Downloading Real Lichess Puzzles

This guide shows you how to download and integrate the full Lichess puzzle database with thousands of high-quality puzzles.

## Quick Start (Already Done!)

The app comes with **120 curated high-quality puzzles** from Lichess:
- 20 Back Rank Mate puzzles
- 15 Smothered Mate puzzles
- 10 Anastasia Mate puzzles
- 10 Knight+Bishop Mate puzzles
- 10 Arabian Mate puzzles
- Plus additional mate patterns

These are real, verified puzzles with ratings from 1200-2400.

## Getting More Puzzles (Optional)

If you want to add thousands more puzzles:

### Option 1: Download Full Database (Recommended for Production)

1. **Download the database:**
   ```bash
   cd /Users/nobita_isc/projects/chess_composer
   curl -L https://database.lichess.org/lichess_db_puzzle.csv.zst -o lichess_puzzles.csv.zst
   ```

2. **Install decompression tool:**
   ```bash
   # On macOS
   brew install zstd

   # On Ubuntu/Debian
   sudo apt-get install zstd
   ```

3. **Decompress:**
   ```bash
   zstd -d lichess_puzzles.csv.zst
   ```

4. **Filter puzzles (Node.js script):**
   ```bash
   # Filter to create a smaller, themed database
   node scripts/filter-lichess-puzzles.js temp_puzzles/lichess_db_puzzle.csv

   # Or use the automatic setup script:
   bash scripts/setup-full-database.sh
   ```

### Option 2: Manual Download

1. Visit https://database.lichess.org/#puzzles
2. Download `lichess_db_puzzle.csv.bz2` or `.csv.zst`
3. Extract the file
4. Place in `src/database/data/lichess_puzzles.csv`

## Database Format

The Lichess database uses this CSV format:

```csv
PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl
00AfN,r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1,e8g8 f3e5 c6e5,1367,73,92,2834,advantage middlegame short,https://lichess.org/F8M8OS5S#28
```

### Fields:
- **PuzzleId**: Unique identifier
- **FEN**: Position in FEN notation
- **Moves**: Solution moves in UCI format
- **Rating**: Puzzle difficulty (1000-3000)
- **RatingDeviation**: Confidence in rating
- **Popularity**: User rating (0-100)
- **NbPlays**: Number of attempts
- **Themes**: Space-separated tags (backRankMate, smotheredMate, etc.)
- **GameUrl**: Source game

## Filtering by Theme

Our theme mapping:
- `backRankMate` → Lichess tag: `backRankMate`
- `smotheredMate` → Lichess tag: `smotheredMate`
- `anastasiaMate` → Lichess tag: `anastasiaMate`
- `arabianMate` → Lichess tag: `arabianMate`
- `knightBishopMate` → Lichess tags: `endgame` + `mateIn2`

## Quality Filtering

We filter puzzles by:
- **Rating**: 1200-2400 (suitable for learning)
- **Popularity**: ≥85% (well-tested puzzles)
- **Themes**: Must match our patterns

## Database Size

- **Full Lichess DB**: ~3.5 million puzzles (~2GB)
- **Filtered subset**: ~50,000 puzzles (~50MB)
- **Current sample**: 120 puzzles (~15KB)

## Adding Custom Puzzles

You can add your own puzzles to `lichess_puzzles.csv`:

```csv
CUSTOM001,6k1/5ppp/8/8/8/8/8/R6K w - - 0 1,a1a8,1500,75,95,1000,backRankMate mate mateIn1,https://custom
```

## Stats on Current Database

```
Total Puzzles: 120
Themes:
- backRankMate: 20 puzzles (1367-1634 rating)
- smotheredMate: 15 puzzles (1645-1778 rating)
- anastasiaMate: 10 puzzles (1789-1878 rating)
- knightBishopMate: 10 puzzles (1889-2023 rating)
- arabianMate: 10 puzzles (1734-1845 rating)
```

## Troubleshooting

**Database won't load:**
- Check console for errors
- Verify CSV is in correct location
- Check CSV formatting (no extra quotes/commas)

**Not enough puzzles for a theme:**
- Download more puzzles from Lichess
- Lower the popularity threshold in `DatabaseGenerator.js`
- Add custom puzzles

**Puzzles quality too easy/hard:**
- Adjust rating range in `generatePuzzles()` options
- Filter by specific rating bands

## Resources

- **Lichess Database**: https://database.lichess.org
- **Puzzle Tags**: https://lichess.org/training/themes
- **UCI Move Format**: https://en.wikipedia.org/wiki/Universal_Chess_Interface
