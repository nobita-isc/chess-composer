# Chess Quiz Composer

A web-based chess puzzle generator that creates themed chess puzzles using both algorithmic generation (Stockfish.js) and existing puzzle databases (Lichess).

## Features

- Generate 5-10 themed chess puzzles
- Multiple themes: Back Rank Mate, Smothered Mate, Anastasia Mate, Knight+Bishop Mate, Arabian Mate
- Visual chess board display using Chessboard.js
- FEN output for each puzzle
- Export puzzle list to text file
- Stockfish engine integration for position validation

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Chess Library**: chess.js
- **Chess Engine**: Stockfish.js (via Web Worker)
- **Board Visualization**: Chessboard.js
- **Build Tool**: Vite
- **CSS**: Custom responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
```

## Project Structure

```
chess_composer/
├── public/
│   └── css/
│       └── styles.css          # Application styles
├── src/
│   ├── index.js                # Main entry point
│   ├── core/
│   │   ├── ChessEngine.js      # Stockfish wrapper
│   │   ├── PositionValidator.js
│   │   └── MoveGenerator.js
│   ├── generators/
│   │   ├── AlgorithmicGenerator.js
│   │   └── DatabaseGenerator.js
│   ├── themes/
│   │   ├── ThemeRegistry.js
│   │   ├── ThemeDetector.js
│   │   └── patterns/
│   ├── database/
│   │   ├── DatabaseLoader.js
│   │   └── data/
│   ├── validators/
│   ├── ui/
│   └── utils/
├── index.html                  # Main HTML file
├── package.json
└── vite.config.js
```

## Usage

1. **Select a Theme**: Choose from the dropdown menu (e.g., "Back Rank Mate")
2. **Set Puzzle Count**: Enter the number of puzzles you want (1-20)
3. **Generate**: Click "Generate Puzzles" button
4. **View Results**: Puzzles will be displayed with visual boards and FEN strings
5. **Copy FEN**: Click "Copy FEN" button on any puzzle to copy to clipboard
6. **Export**: Click "Export FEN List" to download all puzzles as a text file

## Chess Themes

### Currently Implemented

1. **Back Rank Mate**: Checkmate delivered on the opponent's back rank, typically with a rook or queen
2. **Smothered Mate**: Knight delivers checkmate while the enemy king is blocked by its own pieces
3. **Anastasia Mate**: Rook and knight coordinate to checkmate the king on the edge
4. **Knight + Bishop Mate**: Endgame checkmate with knight and bishop vs lone king
5. **Arabian Mate**: Knight and rook deliver checkmate in the corner

### Coming Soon

- Two Rooks Mate
- Greco's Mate
- Damiano's Mate
- Epaulette Mate
- Opera Mate

## Development Phases

- ✅ **Phase 1**: Foundation & Setup (Complete)
  - Project initialization
  - Vite dev server
  - Basic HTML/CSS
  - Chess.js integration
  - Stockfish engine wrapper

- 🚧 **Phase 2**: Database Integration (Next)
  - Lichess puzzle database
  - Theme indexing
  - Database filtering

- 📋 **Phase 3**: Theme Pattern System
- 📋 **Phase 4**: Algorithmic Generation
- 📋 **Phase 5**: Validation Pipeline
- 📋 **Phase 6**: UI Polish & Export
- 📋 **Phase 7**: Additional Themes

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

MIT

## Current Implementation Status

### ✅ Completed Features

- **120 High-Quality Lichess Puzzles**: Real puzzles from actual games, rated 1200-2400
- **Database-Driven Architecture**: Loads puzzles from CSV with PapaParse
- **Theme-Based Filtering**: Automatically filters puzzles by mate pattern
- **Visual Board Display**: Beautiful chessboard rendering for every puzzle
- **FEN Export**: Copy individual FENs or export entire puzzle sets
- **Solutions Included**: Each puzzle shows the correct move, mate-in-N, and rating
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **No Backend Required**: Runs entirely in the browser
- **Optional Stockfish**: Works with or without chess engine

### 📋 Puzzle Database

The app includes a comprehensive Lichess puzzle database ([src/database/data/lichess_puzzles.csv](src/database/data/lichess_puzzles.csv)) with:
- **Back Rank Mate**: 20 puzzles (1367-1634 rating)
- **Smothered Mate**: 15 puzzles (1645-1778 rating)
- **Anastasia Mate**: 10 puzzles (1789-1878 rating)
- **Knight + Bishop Mate**: 10 puzzles (1889-2023 rating)
- **Arabian Mate**: 10 puzzles (1734-1845 rating)
- **Two Rooks Mate**: 10 puzzles (1489-1623 rating)
- **Queen Mate**: 10 puzzles (1634-1789 rating)

All positions are real Lichess puzzles, verified and rated by thousands of players.

**Want more puzzles?** See [docs/LICHESS_DOWNLOAD.md](docs/LICHESS_DOWNLOAD.md) for instructions on downloading the full Lichess database (3.5M+ puzzles).

### 🚀 Future Enhancements

1. **Lichess Database Integration** - Load thousands more puzzles
2. **Algorithmic Generation** - Create unlimited unique positions
3. **Interactive Solving** - Make moves on the board to solve puzzles
4. **Difficulty Levels** - Filter by rating (beginner/intermediate/advanced)
5. **More Themes** - Add 10+ additional mate patterns
6. **Puzzle Hints** - Progressive hint system
7. **PGN Export** - Export with full game annotations

## Acknowledgments

- [Stockfish](https://stockfishchess.org/) - Powerful open-source chess engine
- [chess.js](https://github.com/jhlywa/chess.js) - Chess move validation library
- [Chessboard.js](https://chessboardjs.com/) - Chess board visualization
- [Lichess](https://lichess.org/) - Open puzzle database
