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

Moves alternate between student and computer. Each move has a role and explanation:

```
Solution: Nf6 d4 Bb4 Nxe5 d5
Move sequence:
  1. Student plays: Nf6
     → Hint: "How can Black block White's attack on f7?"
     → After correct: "Great! Nf6 blocks the threat"
  2. Computer plays: d4
     → Explanation: "White pushes in the center to gain space"
  3. Student plays: Bb4
     → Hint: "Pin the knight to win material"
     → After correct: "The pin is devastating"
  4. Computer plays: Nxe5
     → Explanation: "White tries to maintain pressure"
  5. Student plays: d5
     → Hint: "Counter-attack in the center!"
```

Data format — `puzzle_hints` JSON:
```json
[
  { "move": "Nf6", "role": "student", "hint": "Block f7 attack", "explanation": "Nf6 blocks the threat" },
  { "move": "d4", "role": "computer", "explanation": "White pushes for center control" },
  { "move": "Bb4", "role": "student", "hint": "Pin the knight!", "explanation": "The pin wins material" },
  ...
]
```

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
- **Full-screen**: dark board (left) + dark sidebar (right)
- **Sidebar header**: lesson title + back button
- **Instruction card**: teacher avatar + "Black to Move" badge + instruction text
- **Challenge progress**: "Challenge 1/5" with progress bar
- **Two action buttons**: ▶ Video (opens explanation) + 💡 Hint (reveals per-move hint)
- **Move flow**:
  1. Student sees instruction → makes move on board
  2. Correct → show success explanation + computer auto-plays with explanation text
  3. Wrong → show error, let retry
  4. All moves done → "Challenge Complete!" + XP earned + auto-advance to next puzzle
- **Navigation**: ← → arrows between puzzles, progress bar
- **Bottom toolbar**: share, reset, undo, prev/next

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | DB migration + API updates | Pending | Small |
| 2 | Full-screen Puzzle Composer (admin) | Pending | Large |
| 3 | Student Puzzle Player redesign | Pending | Large |

## Design first — confirm on Pencil before implementation.
