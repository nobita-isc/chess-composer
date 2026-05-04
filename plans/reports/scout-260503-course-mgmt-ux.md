# Course Management UX Exploration Report
**Date:** 2026-05-03 | **Scope:** Lesson/exercise/video edit flows

## 1. Entity Hierarchy (Exact)

```
Course
└── Lesson (many)
    └── Content Item (many) — one of: video, pdf, puzzle, quiz
        └── (Puzzle only) Challenge (array in puzzle_challenges JSON)
```

Database structure (CourseRepository.js:18-127):
- **courses** table: id, title, description, skill_level, thumbnail_url
- **lessons** table: id, course_id, order_index, title, description
- **lesson_content** table: id, lesson_id, order_index, content_type, title, video_url, file_path, puzzle_fen, puzzle_moves, puzzle_challenges (JSON), quiz_data (JSON), xp_reward, description, etc.
- No explicit "modules" level—flat lesson hierarchy within course.

## 2. Click Count: Current Navigation Patterns

### (a) Edit lesson text (title/description)
**Current:** 4 clicks
1. Admin lands on CourseManagementPage (line 24)
2. Click "Lessons" button on course row → opens Lesson Manager modal (line 105)
3. Click "Edit" on lesson card → showAppPrompt dialog (line 299)
4. Modify title, click confirm

**Problems:**
- Lesson description cannot be edited at all (only title via prompt)
- Requires modal stacking: Course table → Lesson Manager modal → Prompt modal
- No inline editing; must close prompt to see changes reflected

### (b) Edit/add exercise inside lesson
**Current:** 5-6 clicks (add) or 6-7 clicks (edit)

**To add exercise:**
1. From course row → click "Lessons" (line 105)
2. Lesson Manager modal opens → click "Content" button (line 315)
3. Lesson Content Editor overlay opens (line 320, showLessonContentEditor)
4. Click "+ PUZZLE" button (line 70-76, adds to puzzle array)
5. Puzzle Composer opens full-screen (openPuzzleComposer, line 182)
6. Fill FEN, moves, hints, title (puzzle-composer.js)
7. Click "Save All" → returns to Content Editor list (must render())

**To edit exercise:**
1-4. Same as add → get to Content Editor
5. Click "Edit" on puzzle item (line 111)
6. Puzzle Composer re-opens with existingContent (line 200)
7. Modify and save

**Pain points:**
- Full-screen modals stack deeply (no breadcrumb escape path)
- After edit, returns to Content Editor—no direct return to lesson list
- Puzzle save doesn't preserve editor state (calls render(), loses scroll position)

### (c) Edit embedded video
**Current:** 5 clicks

1. From course → click "Lessons"
2. Click "Content" on lesson
3. Content Editor overlay opens
4. Click "Edit" on video item
5. showEditContentDialog opens (line 364-483, lesson-content-editor.js)
   - Full-page overlay with markdown editor
   - Can edit title + description only (not video URL; requires delete+recreate)

**Critical gap:** Cannot edit video URL inline—must delete and re-upload/re-link.

## 3. Major UI Components

- **Modals:** `pv-overlay` class (z-index stacking: 50000, 55000, 60000+)
  - Lesson Manager modal (z-index 50000, line 233)
  - Content Editor overlay (z-index 50000, line 35)
  - Puzzle Composer overlay (z-index 50000, line 96)
  - Upload Content Dialog (z-index 60000, line 229)
  - Edit Content Dialog (z-index 60000, line 376)
  - Lesson Player (z-index 50000, line 145)

- **Inline components:** None; all editing in overlays

- **Accordions:** None; flat list rendering

- **Splitters:** Exist in lesson-player.js (lines 22-53, 296-321)
  - Horizontal splitter for sidebar resize (line 208)
  - Vertical splitter for notes pane (line 215)
  - Double-click resets to defaults; drag updates localStorage
  - Currently NOT used in management UI—only in student player

## 4. Pain Points Causing Excessive Clicks

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Modal stacking (3-4 layers deep) | Each overlay is full-screen `pv-overlay` (line 233, 376) | User loses context; hard to navigate back |
| Lesson description not editable | Only title prompt in Lesson Manager (line 299-304) | Requires new lesson + copy data |
| Video URL immutable | Edit dialog only allows title/description (line 364) | Delete + re-upload required |
| No breadcrumb navigation | "Back" buttons close entire modal, forcing re-render (line 244) | Can't skip levels (e.g., Lesson Manager → single Lesson → Content) |
| No state persistence | render() called on every action; no scroll/expand memory (line 250-294) | Loses position after edit |
| Puzzle save re-renders parent | Full Content Editor re-render after puzzle save (line 186) | Scroll position lost; unexpected UX |
| No progress indicator | 5-6 clicks with no step indicator | User doesn't know depth of flow |
| File upload in dialog | showUploadContentDialog as separate modal (line 219-359) | Stacks on top of Content Editor (z-index 60000 vs 50000) |

## 5. Reusable Widgets & Infrastructure

**Splitter system (lesson-player.js:22-53, 296-321):**
- Drag-to-resize handle with hover tint (line 24)
- Supports both x-axis (horizontal) and y-axis (vertical)
- localStorage persistence for size (LS_SIDEBAR, LS_NOTES, line 92-93, 305)
- Double-click resets to defaults (line 28)
- ResizeObserver for responsive video fitting (line 443)

**Not yet used in management UI** but directly applicable:
- Split pane layout: lesson list (left) + editor (right) instead of modals
- Drag sidebar to hide/show lesson list while editing
- localStorage keys: could persist "expanded lesson", "last edited content"

**Tab system (lesson-player.js:197-199, 324-338):**
- Sidebar tabs: Content ↔ Notes
- Active tab styling (color, font-weight, border)
- No re-render; just display toggle (line 335-336)

## 6. State Persistence

**Current state:** NONE. No memory of:
- Which lesson was expanded/editing before refresh
- Which content item was being edited
- Sidebar/notes pane sizes
- Active tab in lesson player

**What exists:**
- lesson-player.js uses localStorage for pane sizes (line 101-103: readNum, lclamp)
  - LS_SIDEBAR: sidebar width (220-480px, default 300)
  - LS_NOTES: notes pane height
  - lp-notes-collapsed: boolean
  - Persisted after drag (line 305, 320)

**Missing in management UI:**
- No localStorage for "last course viewed"
- No localStorage for "last lesson expanded"
- No sessionStorage for undo/redo of edits
- Refresh loses all position

## Unresolved Questions

1. **Why no modules?** Is hierarchical grouping (course → module → lesson → content) planned?
2. **Puzzle challenges:** Are multi-challenge puzzles (puzzle_challenges JSON array) intended for branching paths, or just sequential attempts?
3. **Video URL mutability:** Is immutability intentional (safety), or oversight?
4. **Lesson description:** Why not editable? UX oversight or data model constraint?
5. **Commit cdceebd "resizable panes":** What was the scope? Is it partial implementation, or blocked feature?

## Recommendation Direction

- Replace modal stacking with 3-pane layout (course list | lesson list | editor pane)
- Use splitters to toggle visibility (like lesson-player.js)
- Add breadcrumb to skip modal layers
- Persist lesson/content selection in localStorage
- Inline edit for lesson title/description (avoid prompts)
- Allow video URL edit without delete
- Show step indicator (e.g., "1 of 5: Lesson → Content → Editor")
