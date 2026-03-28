# Puzzle Composer Redesign

**Goal:** Chess.com-style puzzle challenges with per-puzzle instructions, per-move hints, and full-screen admin composer.

**Reference:** chess.com lesson challenges (screenshot)

## Current vs New

| Current | New (chess.com style) |
|---------|----------------------|
| Single FEN + moves | FEN + moves + instruction text + per-move hints |
| Simple prompt dialog | Full-screen puzzle composer |
| No hints system | Per-move hint text (e.g. "Consider attacking f7") |
| One puzzle at a time | Multi-puzzle batch editor |

## Data Model Changes

### `lesson_content` table — extend puzzle fields:
```
puzzle_instruction TEXT   -- "White's threat to f7 is ineffective. How should Black defend?"
puzzle_hints TEXT         -- JSON: ["Look at the knight", "Nf6 blocks the attack", ...]
puzzle_video_url TEXT     -- optional video explanation for this puzzle
```

Each hint corresponds to a move in the solution sequence. If solution is "Nf6 d4 Bb4", hints could be:
- Move 1 hint: "How can Black block White's attack on f7?"
- Move 2 hint: "What's Black's best response to d4?"
- Move 3 hint: "Pin the knight!"

## Admin Screens

### 1. Full-Screen Puzzle Composer
- **Left panel**: Chess board preview (rendered from FEN)
- **Right panel**: Form fields
  - FEN Position input
  - Instruction text (rich text area — what the student sees before solving)
  - Solution moves (SAN)
  - Per-move hints (add hint per move, expandable list)
  - Rating, themes
  - Video URL (optional explanation video)
- **Bottom toolbar**: Save, Cancel, Add Another Puzzle
- **Multi-puzzle mode**: Tabs or list showing all puzzles in the lesson

### 2. Student Puzzle Player (chess.com style)
- Full-screen board with dark sidebar
- Instruction text with teacher avatar
- "Challenge X/10" progress
- Hint button reveals per-move hint
- Video button opens explanation
- Navigation arrows between puzzles

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | DB migration + API updates | Pending | Small |
| 2 | Full-screen Puzzle Composer (admin) | Pending | Large |
| 3 | Student Puzzle Player redesign | Pending | Large |

## Design first — confirm on Pencil before implementation.
