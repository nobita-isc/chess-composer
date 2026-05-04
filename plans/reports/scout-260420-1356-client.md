# CLIENT Package Scout Report
**Date:** 2026-04-18 | **Scope:** packages/client/src | **Thoroughness:** Medium

## 1. Directory Tree (packages/client/src)

```
src/
├── api/                  # ApiClient for server communication
├── auth/                 # JWT auth, login, user management
├── core/                 # Router, engine, route config
├── data/                 # Sample data fixtures
├── exercises/            # Student exercise management
├── generators/           # (empty, legacy)
├── lessons/              # Chess lessons platform (6 modules)
├── puzzles/              # Puzzle generation, validation
├── reports/              # Admin reporting/analytics
├── shared/               # 9 reusable modules (puzzle board, sync, storage, etc.)
├── themes/               # Theme patterns (empty)
├── ui/                   # (empty, legacy)
├── utils/                # (empty, legacy)
├── validators/           # (empty, legacy)
├── views/                # GenerateView (puzzle generator UI)
└── index.js              # Bootstrap entry point
```

## 2. Views/Pages (packages/client/src/views/*.js)

- **GenerateView.js** (31KB): Admin puzzle generation UI. Chess.com-style form (theme selector, count, difficulty). Renders static card grid. Integrates theme multi-select + puzzle generation pipeline. Owns `ChessQuizComposer` class lifecycle.

## 3. Lessons Module (packages/client/src/lessons/)

The chess lessons platform with six focused modules:

- **CourseManagementPage.js**: Admin view for course CRUD, lesson management, course preview, metadata editing
- **lesson-content-editor.js**: Full-page editor for lesson content items (video, PDF, puzzle, quiz). Integrates markdown editor + puzzle composer
- **lesson-player.js**: Coursera-style lesson player. Sidebar navigation, auto-play, description toggle, offline notes download, and puzzle/exercise embedding
- **lesson-puzzle-player.js**: Chess.com-style interactive puzzle within lesson player. Per-move hints, computer auto-play with explanations, move validation
- **puzzle-composer.js**: Full-screen puzzle editor (board left, form right). Multi-puzzle batch creation, per-move hints with student/computer roles
- **student-courses-page.js**: Student view: browse assigned courses, see progress, open lesson player. Links to gamification badges

## 4. Shared Modules (packages/client/src/shared/)

Nine reusable components serving the entire platform:

- **interactive-puzzle-board.js** (NEW): Chessground lifecycle + puzzle interaction. Board recreation after opponent moves (avoids Chessground set() corruption). Callbacks: onCorrectMove, onWrongMove, onOpponentMove, onPuzzleComplete, onBoardReady
- **safe-markdown.js** (NEW): Wrapper around marked + DOMPurify. All markdown rendering goes through this module. `safeMarkdown(md)` returns sanitized HTML
- **markdown-editor.js** (NEW): Split-pane editor with toolbar (bold, italic, heading, link, lists). Live preview using safe-markdown
- **content-download-helper.js** (NEW): Client-side content downloads. `downloadAsStyledHtml()` and `downloadAsMarkdown()` use Blob + createObjectURL
- **offline-storage.js** (NEW): IndexedDB wrapper (DB_NAME='chess-trainer-offline'). Two stores: puzzle-progress and sync-queue. Supports lastUpdated and synced flags
- **sync-manager.js** (NEW): Processes offline sync queue when connection restores. Uses online/offline window events (no Background Sync API). Manages sync badge and offline banner UI
- **chess-puzzle-utils.js**: Pure utility functions (parseUciMove, getLegalMoves, escapeHtml). No Chessground dependency
- **app-dialogs.js**: Styled dialogs (showAppConfirm, showAppPrompt, showAppAlert). Replaces native confirm/prompt/alert with design-system components
- **theme-multi-select.js**: Reusable multi-select widget for puzzle themes. Used by GenerateView and puzzle-composer

## 5. Core/UI/Auth Modules

- **core/HashRouter.js**: Client-side hash-based router. Guards, route rendering, sidebar active state management
- **core/routeConfig.js**: Route definitions (admin + student + login paths). Role-based guards (authGuard, adminGuard, studentGuard). Sidebar navigation map
- **core/ChessEngine.js**: Stockfish wrapper using Web Worker. Evaluation, best move, mate detection (legacy, minimal usage in modern UI)
- **core/ChessEngineV2.js**: (exists, not detailed)
- **auth/AuthManager.js**: JWT token storage (localStorage). Methods: setTokens, getAccessToken, isAuthenticated, isAdmin, isStudent, logout, refresh
- **auth/LoginView.js**: Login form UI
- **auth/StudentDashboard.js**: Student homepage with tabs (my-exercises, courses, performance). Gamification integration
- **auth/UserManagementPanel.js**: Admin page for user CRUD and student profile linking
- **api/ApiClient.js**: HTTP client for server API. Methods for puzzles, courses, exercises, users, gamification. Handles auth token injection + refresh

## 6. Entry Point (index.js)

**Bootstrap flow:**
1. DOMContentLoaded listener initializes auth + sync manager (initSyncManager gets auth token getter)
2. Unauthenticated → HashRouter with login routes, show LoginView
3. Authenticated:
   - **Student role** → student-container, routes: /my-exercises, /courses, /performance
   - **Admin role** → setup sidebar + dynamic nav, initialize ChessQuizComposer, routes: /generate, /exercises, /reports, /courses, /users
4. Route rendering with cleanup (currentCleanup functions prevent memory leaks)
5. /generate view special-cases static DOM (GenerateView); all others render into view-container
6. Sidebar nav buttons map to router.navigate()

## 7. PWA Setup (vite.config.js)

**Plugin:** vite-plugin-pwa with Workbox
- **Disabled in dev** (per recent commit 0c7cca3: "Disable PWA plugin in development to restore Vite HMR")
- **Conditional:** `mode !== 'development' && VitePWA({...})`
- **registerType:** autoUpdate
- **Runtime caching:** Google Fonts (StaleWhileRevalidate + CacheFirst for 1 year)
- **No manifest** (manifest: false)
- **includeAssets:** favicon.svg
- **Dev server:** Vite proxy to /api and /uploads (localhost:3001)

**Offline sync:**
- Puzzle progress saved to IndexedDB BEFORE API call (local-first)
- sync-manager monitors online/offline events, flushes queue on reconnect
- Badge updates show unsynced count

## 8. New Dependencies

**dompurify (^3.3.3):** Used only in safe-markdown.js for HTML sanitization after marked parsing

**marked (^18.0.0):** Used only in safe-markdown.js. Configured with `breaks: true` for line break rendering

Both dependencies centralized in safe-markdown.js module for single-source control.

## Summary of Recent Feature Releases

- **Chess lessons platform** (CourseManagementPage, lesson-player, lesson-content-editor)
- **Puzzle composer redesign** (chess.com-style, multi-puzzle batches)
- **Content descriptions** (markdown editor, safe rendering, download as HTML/markdown)
- **Shared puzzle board refactor** (InteractivePuzzleBoard class, Chessground recreation fix)
- **Offline sync** (IndexedDB storage, sync queue, online/offline events)
- **PWA support** (Workbox, disabled in dev to preserve HMR)

