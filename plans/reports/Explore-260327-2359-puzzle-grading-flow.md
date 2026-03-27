# Puzzle Grading Flow Exploration Report

## Overview
Explored PuzzlePlayer.js grading mode, ExercisePuzzleViewer.js structure, and how grading is triggered from ExercisePanel.js.

---

## 1. PuzzlePlayer.js - Grading Mode

### Key Function Signature
```javascript
openPuzzlePlayer(exercise, options = {})
```

### Options Structure (Grading-Specific)
```javascript
{
  gradingMode: boolean          // Enable grading UI
  assignment: object            // Single student assignment
  assignments: array            // Multiple student assignments
  apiClient: ApiClient          // For saving grades
  onGraded: function            // Callback when dialog closes
}
```

### Data Structures

**studentResults** (tracking grades per student per puzzle):
```javascript
const studentResults = students.map((student) => {
  // Load existing puzzle_results from "score1,0,1" format
  if (student.puzzle_results) {
    const parts = student.puzzle_results.split(',');
    return puzzles.map((_, i) => {
      if (i < parts.length && parts[i] !== '') {
        return parts[i] === '1';  // true/false/null
      }
      return null;
    });
  }
  return new Array(puzzles.length).fill(null);
});
```

Expected fields on assignment object:
- `id`: Student exercise ID
- `student_name`: Display name
- `puzzle_results`: Comma-separated string (e.g., "1,0,1,,0") where "1"=correct, "0"=wrong, empty=not graded

### UI Structure (Grading Mode)

```
┌─ Header
│  ├─ Title + Exercise Name
│  ├─ Progress: "1 / 5"
│  └─ Score: "Score: 2/5"
├─ Student Tabs (if multiple students)
│  ├─ Student Name
│  └─ Score: "2/5"
├─ Grading Overview (puzzle dots)
│  └─ [1][2][3][4][5]  (colored: active/correct/wrong)
├─ Main Content
│  ├─ Board (400x400)
│  └─ Info Panel
│     ├─ Turn indicator
│     ├─ Last move
│     ├─ Rating
│     ├─ Grading Buttons
│     │  ├─ ✓ Correct
│     │  └─ ✗ Wrong
│     ├─ Grade Status ("Marked as correct")
│     ├─ Controls
│     ├─ Solution Display
│     └─ Actions
│        ├─ "Grades are saved automatically"
│        └─ "Done" button
```

### Grading Workflow

#### Mark Correct
```javascript
markCorrect() {
  studentResults[currentStudentIndex][currentIndex] = true
  updateGradingUI()
  saveStudentGrade(currentStudentIndex)  // API call
  autoAdvance()  // Find next ungraded puzzle
}
```

#### Save Grade (Auto-Save)
```javascript
saveStudentGrade(studentIndex) {
  // Show "Saving..." status
  const results = studentResults[studentIndex]
  const correctCount = results.filter(r => r === true).length
  
  // Convert to comma-separated string for API
  const puzzleResultsStr = results.map(r => {
    if (r === true) return '1'
    if (r === false) return '0'
    return ''
  }).join(',')
  
  // Call: apiClient.gradeExercise(student.id, correctCount, null, puzzleResultsStr)
  // Shows "Saved (2/5)" confirmation
}
```

#### Auto-Advance Logic
```javascript
autoAdvance() {
  // Find next ungraded puzzle WITHIN current student
  for (let i = currentIndex + 1; i < puzzles.length; i++) {
    if (results[i] === null) {
      setTimeout(() => initPuzzle(i), 300)
      return
    }
  }
  // If none after, check before current index
  for (let i = 0; i < currentIndex; i++) {
    if (results[i] === null) {
      setTimeout(() => initPuzzle(i), 300)
      return
    }
  }
  // All graded - stay on current, user switches student via tabs
}
```

#### Update Grading UI
```javascript
updateGradingUI() {
  // Update dots: .active, .correct, .wrong
  // Update score: "Score: X/puzzles.length"
  // Update student tabs: show scores, mark .complete when all graded
  // Update buttons: show .selected if graded
  // Update "Done" button text: "Done (2 students graded)" or "2 puzzles remaining"
}
```

#### Multi-Student Flow
```javascript
switchStudent(studentIndex) {
  currentStudentIndex = studentIndex
  
  // Jump to first ungraded puzzle for that student (or 0)
  const firstUngraded = results.findIndex(r => r === null)
  initPuzzle(firstUngraded >= 0 ? firstUngraded : 0)
}
```

### Close & Callback
```javascript
function close() {
  if (gradingMode && onGraded) {
    const results = students.map((student, i) => ({
      studentId: student.id,
      score: studentResults[i].filter(r => r === true).length,
      total: puzzles.length
    }))
    onGraded(results)  // Pass results to callback
  }
}
```

### Keyboard Shortcuts (Grading Mode)
- `C` or `1`: Mark Correct
- `X` or `0`: Mark Wrong
- Arrow Left/Right: Navigate puzzles
- `Escape`: Close dialog

---

## 2. ExercisePuzzleViewer.js

### Key Function
```javascript
openExercisePuzzleViewer(exercise, options = {})
```

Options:
```javascript
{
  startIndex: number  // Start at specific puzzle (default 0)
}
```

### Puzzle Conversion
Converts exercise puzzle format (UCI moves) to viewer format:
```javascript
convertExercisePuzzle(puzzle, index) {
  // puzzle.fen, puzzle.moves (UCI), puzzle.rating, puzzle.themes
  return {
    id: puzzle.id,
    fen, rating, themeName,
    solutionLine: [SAN moves],
    opponentMove: string,  // First move (if puzzle starts after opponent move)
    sideToMove, sideToFind, movesCount
  }
}
```

### UI Structure
```
┌─ Header
│  ├─ Title - #1
│  ├─ Theme Badge (e.g., "Back Rank")
│  ├─ Difficulty Badge ("Beginner", "Intermediate", "Advanced")
│  └─ Navigation: [◀][1 / 5][▶][✕]
├─ Main Content
│  ├─ Board (with Flip Board button)
│  └─ Panel
│     ├─ Position Info ("White to move")
│     ├─ Rating
│     ├─ Solve in (X moves)
│     ├─ Moves List
│     ├─ FEN (with copy button)
│     └─ Actions
│        ├─ Show Hint
│        └─ Show Solution
└─ Status Banner (hint/solution/success)
```

### Puzzle Navigation
- Prev/Next buttons navigate through puzzles
- Puzzle dots for quick jump
- Board flip button to change orientation

### No Grading Features
ExercisePuzzleViewer is **read-only** for viewing/studying puzzles. It does not:
- Record any results
- Have grading buttons
- Send API calls
- Have student tabs or multi-student support

---

## 3. How Grading is Triggered from ExercisePanel.js

### Grading Flows in ExercisePanel.js

#### Flow 1: "Grade All Students" (Single Click)
```javascript
// Location: showExerciseDetails() dialog
const gradeAllBtn = dialog.querySelector('#grade-all-btn');
gradeAllBtn.addEventListener('click', () => {
  openPuzzlePlayer(exercise, {
    gradingMode: true,
    assignments,  // All student assignments
    apiClient,
    onGraded: () => {
      showToast('Graded successfully');
      closeDialog();
      showExerciseDetails(exerciseId);  // Refresh
    }
  });
});
```

#### Flow 2: "Grade Puzzles" per Student (▶️ Button)
```javascript
dialog.querySelectorAll('.grade-puzzles-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const studentExerciseId = btn.dataset.id;
    const assignment = assignments.find(a => a.id === studentExerciseId);

    openPuzzlePlayer(exercise, {
      gradingMode: true,
      assignments: [assignment],  // Single student
      apiClient,
      onGraded: () => {
        showToast('Graded successfully');
        dialog.remove();
        showExerciseDetails(exerciseId);
      }
    });
  });
});
```

#### Flow 3: Quick Grade (📝 Button - Uses GradeDialog)
```javascript
dialog.querySelectorAll('.grade-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const studentExerciseId = btn.dataset.id;
    const assignment = assignments.find(a => a.id === studentExerciseId);
    
    // Opens quick-grade dialog (NOT puzzle player)
    const result = await showGradeDialog(apiClient, assignment);
    if (result) {
      showToast('Graded successfully');
      dialog.remove();
      await showExerciseDetails(exerciseId);
    }
  });
});
```

#### Flow 4: Grade All Submitted (In GradeDialog)
```javascript
if (gradeAllBtn) {
  gradeAllBtn.addEventListener('click', () => {
    const submitted = assignments.filter(a => a.status === 'submitted');
    
    openPuzzlePlayer(exercise, {
      gradingMode: true,
      assignments: submitted,  // All submitted
      apiClient,
      onGraded: () => {
        showToast('All grades saved');
        closeDialog();
        showExerciseDetails(exerciseId);
      }
    });
  });
}
```

### Button Locations & Labels
1. **showExerciseDetails** dialog:
   - `#grade-all-btn` (primary): "▶️ Grade All Students"
   - `.grade-puzzles-btn` (per student): "▶️" (puzzle grading mode)
   - `.grade-btn` (per student): "📝" (quick grade, uses GradeDialog)
   - `.download-btn`: "📥" (download answer PDF)

2. **showStudentAssignments** view:
   - `[data-action="grade-puzzles"]`: "Grade" button
   - `[data-action="grade-all"]`: "Grade All Submitted" button

---

## Key Data Flow

### Grading Save Path
```
User clicks "✓ Correct" 
  → markCorrect()
  → studentResults[currentStudentIndex][currentIndex] = true
  → saveStudentGrade(currentStudentIndex)  [Auto]
    → API: gradeExercise(student.id, correctCount, null, puzzleResultsStr)
    → Show "Saving..." → "Saved (2/5)"
  → autoAdvance()  [Moves to next ungraded]
```

### Close & Refresh Path
```
User clicks "Done"
  → finishGrading()
  → close()
    → onGraded(results)  [Callback from ExercisePanel]
      → showToast('Graded successfully')
      → showExerciseDetails(exerciseId)  [Refreshes list]
```

---

## Data Format: puzzle_results

String format for storing per-puzzle results:
```
"1,0,1,,0"
 ↓ ↓ ↓ ↓ ↓
 P1 P2 P3 P4 P5

'1' = correct
'0' = wrong
''  = not graded (null)
```

This is stored in `assignment.puzzle_results` and passed to API as `puzzleResultsStr`.

---

## Summary Table

| Aspect | PuzzlePlayer | ExercisePuzzleViewer |
|--------|--------------|---------------------|
| Purpose | Grade puzzles or practice | View/study puzzles |
| Grading Mode | ✓ Yes | ✗ No |
| Multi-Student | ✓ Yes (tabs) | ✗ No |
| Student Tabs | ✓ Yes | ✗ No |
| Grade Buttons | ✓ Yes (Correct/Wrong) | ✗ No |
| Auto-Save | ✓ Yes (per grade) | ✗ No |
| Progress Dots | ✓ Yes (colored) | ✓ Yes (for nav) |
| Solution Display | ✓ Yes (inline) | ✓ Yes (on button click) |
| Keyboard Shortcuts | ✓ Yes (C/X for grade) | ✗ No |
| Can Practice | ✓ Optionally | ✓ Yes |

---

## Unresolved Questions
None identified. All grading flows, data structures, and UI interactions are clear.
