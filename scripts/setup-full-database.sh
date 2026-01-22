#!/bin/bash

###############################################################################
# Setup Full Lichess Puzzle Database
#
# This script downloads and filters the complete Lichess puzzle database
# Size: ~500MB compressed, ~2GB uncompressed, ~50MB filtered
#
# Usage: bash scripts/setup-full-database.sh
###############################################################################

set -e  # Exit on error

echo "🏁 Lichess Puzzle Database Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if zstd is installed
if ! command -v zstd &> /dev/null; then
    echo -e "${YELLOW}⚠️  zstd is not installed${NC}"
    echo ""
    echo "Installing zstd for decompression..."
    echo ""

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "📦 Installing via Homebrew..."
            brew install zstd
        else
            echo -e "${RED}❌ Homebrew not found. Please install Homebrew first:${NC}"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            echo "📦 Installing via apt..."
            sudo apt-get update
            sudo apt-get install -y zstd
        elif command -v yum &> /dev/null; then
            echo "📦 Installing via yum..."
            sudo yum install -y zstd
        else
            echo -e "${RED}❌ Could not detect package manager. Please install zstd manually.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Unsupported OS: $OSTYPE${NC}"
        echo "Please install zstd manually:"
        echo "  macOS: brew install zstd"
        echo "  Ubuntu/Debian: sudo apt-get install zstd"
        exit 1
    fi

    echo -e "${GREEN}✅ zstd installed successfully${NC}"
    echo ""
fi

# Create temp directory
TEMP_DIR="./temp_puzzles"
mkdir -p "$TEMP_DIR"

echo -e "${BLUE}📥 Step 1: Downloading Lichess puzzle database${NC}"
echo "   URL: https://database.lichess.org/lichess_db_puzzle.csv.zst"
echo "   Size: ~500MB (this may take a few minutes)"
echo ""

COMPRESSED_FILE="$TEMP_DIR/lichess_db_puzzle.csv.zst"
UNCOMPRESSED_FILE="$TEMP_DIR/lichess_db_puzzle.csv"

# Download if not already downloaded
if [ -f "$COMPRESSED_FILE" ]; then
    echo -e "${GREEN}✓ Compressed file already exists, skipping download${NC}"
else
    curl -L https://database.lichess.org/lichess_db_puzzle.csv.zst -o "$COMPRESSED_FILE" --progress-bar
    echo -e "${GREEN}✅ Download complete${NC}"
fi
echo ""

echo -e "${BLUE}📦 Step 2: Decompressing database${NC}"
echo "   This will create a ~2GB file"
echo ""

if [ -f "$UNCOMPRESSED_FILE" ]; then
    echo -e "${GREEN}✓ Uncompressed file already exists, skipping decompression${NC}"
else
    zstd -d "$COMPRESSED_FILE" -o "$UNCOMPRESSED_FILE"
    echo -e "${GREEN}✅ Decompression complete${NC}"
fi
echo ""

echo -e "${BLUE}🔍 Step 3: Filtering puzzles by theme and quality${NC}"
echo "   This will create a ~50MB filtered database"
echo "   Filtering criteria:"
echo "     - Rating: 1000-2500"
echo "     - Popularity: ≥80%"
echo "     - Plays: ≥100"
echo "     - Themes: mate patterns, tactics"
echo ""

node scripts/filter-lichess-puzzles.js "$UNCOMPRESSED_FILE"

echo ""
echo -e "${BLUE}🧹 Step 4: Cleaning up temporary files${NC}"
echo ""

read -p "Delete temporary files (~2.5GB)? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}✅ Temporary files deleted${NC}"
else
    echo -e "${YELLOW}⚠️  Keeping temporary files in: $TEMP_DIR${NC}"
    echo "   You can delete them manually later to free up space"
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "📊 Your app now has access to thousands of high-quality puzzles!"
echo ""
echo "📁 Files created:"
echo "   src/database/data/lichess_puzzles_filtered.csv"
echo ""
echo "🔧 To use the filtered database:"
echo "   1. Rename or backup your current database:"
echo "      mv src/database/data/lichess_puzzles.csv src/database/data/lichess_puzzles_sample.csv"
echo "   2. Use the filtered database:"
echo "      mv src/database/data/lichess_puzzles_filtered.csv src/database/data/lichess_puzzles.csv"
echo "   3. Restart your app"
echo ""
echo "✨ Enjoy thousands of high-quality chess puzzles!"
