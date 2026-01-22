# Quick Start Guide - Chess Quiz Composer

## Current Status ✅

Your app is **ready to use** with **120 high-quality Lichess puzzles**!

- ✅ Database loaded and working
- ✅ 7 themes available
- ✅ Ratings from 1200-2400
- ✅ All puzzles verified by Lichess community

## Using the App

### 1. Start the Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 2. Generate Puzzles

1. Select a theme (e.g., "Back Rank Mate")
2. Choose number of puzzles (1-20)
3. Click "Generate Puzzles"
4. View puzzles with solutions and ratings!

### 3. Export Puzzles

Click "Export FEN List" to download all puzzles as a text file.

## Want More Puzzles? (Optional)

### Option 1: Automatic Setup (Recommended)

Download and filter the full Lichess database automatically:

```bash
bash scripts/setup-full-database.sh
```

This will:
- Download ~500MB compressed database
- Decompress to ~2GB
- Filter to ~50MB (10,000+ high-quality puzzles)
- Clean up temporary files

**Time:** 5-10 minutes depending on internet speed

### Option 2: Manual Setup

**Step 1: Download**
```bash
mkdir -p temp_puzzles
curl -L https://database.lichess.org/lichess_db_puzzle.csv.zst -o temp_puzzles/lichess_db_puzzle.csv.zst
```

**Step 2: Install zstd**
```bash
# macOS
brew install zstd

# Ubuntu/Debian
sudo apt-get install zstd
```

**Step 3: Decompress**
```bash
zstd -d temp_puzzles/lichess_db_puzzle.csv.zst -o temp_puzzles/lichess_db_puzzle.csv
```

**Step 4: Filter**
```bash
node scripts/filter-lichess-puzzles.js temp_puzzles/lichess_db_puzzle.csv
```

**Step 5: Use filtered database**
```bash
# Backup current database
mv src/database/data/lichess_puzzles.csv src/database/data/lichess_puzzles_backup.csv

# Use filtered database
mv src/database/data/lichess_puzzles_filtered.csv src/database/data/lichess_puzzles.csv
```

**Step 6: Restart app**
```bash
# Press Ctrl+C to stop, then:
npm run dev
```

## Testing the Filter Script

Test with your current database:

```bash
node scripts/filter-lichess-puzzles.js src/database/data/lichess_puzzles.csv /tmp/test_output.csv
```

You should see:
```
✅ Filtering Complete!
📊 Statistics:
  Total puzzles processed: 86
  Puzzles kept: 85
  ...
```

## Troubleshooting

### "Module not found" error

**Problem:** `filter-lichess-puzzles.js` not found

**Solution:** Make sure you're in the project root directory:
```bash
cd /Users/nobita_isc/projects/chess_composer
node scripts/filter-lichess-puzzles.js [input-file]
```

### "zstd: command not found"

**Problem:** Decompression tool not installed

**Solution:**
```bash
# macOS
brew install zstd

# Ubuntu/Debian
sudo apt-get install zstd

# Or skip decompression and download pre-extracted CSV
```

### "Input file not found"

**Problem:** Database file path is wrong

**Solution:** Check the file exists:
```bash
ls -lh temp_puzzles/lichess_db_puzzle.csv
```

### Database not loading in app

**Problem:** CSV format issue or wrong path

**Solution:**
1. Check file exists: `ls -lh src/database/data/lichess_puzzles.csv`
2. Check first few lines: `head -5 src/database/data/lichess_puzzles.csv`
3. Verify format has header: `PuzzleId,FEN,Moves,Rating,...`
4. Check browser console for errors

### "CORS error" when loading CSV

**Problem:** Browser security blocking local file access

**Solution:** CSV files in `src/database/data/` should work. If not:
1. Make sure file is in `src/` directory (not `public/`)
2. Restart dev server: `npm run dev`
3. Clear browser cache

## File Sizes Reference

| Database | Size | Puzzles | Use Case |
|----------|------|---------|----------|
| **Current** (lichess_puzzles.csv) | 15 KB | 120 | Development, testing |
| **Filtered** (after setup) | ~50 MB | ~10,000 | Production, variety |
| **Full** (lichess_db_puzzle.csv) | ~2 GB | 3.5M | Research, everything |

## Commands Reference

```bash
# Start app
npm run dev

# Build for production
npm run build

# Test filter script
node scripts/filter-lichess-puzzles.js [input] [output]

# Download full database (automatic)
bash scripts/setup-full-database.sh

# Download full database (manual)
curl -L https://database.lichess.org/lichess_db_puzzle.csv.zst -o puzzles.csv.zst
zstd -d puzzles.csv.zst
node scripts/filter-lichess-puzzles.js lichess_db_puzzle.csv
```

## What's Next?

1. ✅ **Current**: 120 curated puzzles (ready to use!)
2. 🔄 **Optional**: 10,000+ puzzles (run setup script)
3. 🚀 **Future**: Interactive solving, more themes, algorithmic generation

## Need Help?

- Check [docs/LICHESS_DOWNLOAD.md](docs/LICHESS_DOWNLOAD.md) for detailed guide
- Check [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) for technical details
- Check browser console for error messages
- Verify files exist: `ls -lh src/database/data/`

---

**Pro Tip:** The current 120 puzzles are enough to get started! Only download the full database if you need more variety.
