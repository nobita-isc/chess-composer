# Phase 6: Learning View UX Improvements

## Context Links
- [lesson-player.js](../../packages/client/src/lessons/lesson-player.js)
- [Phase 4](./phase-04-lesson-player-descriptions.md) — descriptions already rendering
- [Phase 5](./phase-05-download-learning-materials.md) — download already wired

## Overview
- **Priority**: P3
- **Status**: ✅ complete
- **Description**: Polish the lesson player UX with collapsible descriptions, improved visual hierarchy, and a sidebar notes quick-reference.

## Key Insights
- Current lesson player (244 lines pre-changes, ~290 after Phase 4/5) has a clean Coursera-like layout. Changes should enhance, not overhaul.
- Long descriptions (chess opening theory) could push the "Mark Complete" button below the fold. Collapsible panel solves this.
- Sidebar currently only shows navigation items. A "Notes" toggle at the bottom could list all descriptions for quick reference.
- YAGNI: implement only what demonstrably improves the learning experience. Avoid over-engineering.

## Requirements

### Functional
- **Collapsible description panel**: descriptions collapse/expand with a toggle. Default: expanded for short descriptions (<300 chars), collapsed for long ones.
- **Visual hierarchy improvement**: clearer separation between content (video/PDF) area and description area. Subtle background color change.
- **Sidebar "Notes" tab**: toggle between "Content" (current navigation) and "Notes" (list of all descriptions in lesson). Clicking a note scrolls to that content item.

### Non-functional
- Smooth expand/collapse animation (CSS transition on max-height)
- No layout shift when toggling
- Keep changes focused — avoid restructuring the entire player

## Related Code Files

### Modify
1. **`packages/client/src/lessons/lesson-player.js`**

## Implementation Steps

### A. Collapsible Description Panel

1. Update `renderDescription()` (from Phase 4) to wrap content in a collapsible container:
   ```javascript
   function renderDescription(markdown) {
     if (!markdown?.trim()) return ''
     const html = marked.parse(markdown, { breaks: true })
     const isLong = markdown.length > 300
     return `
       <div class="lp-description-panel" style="padding:0 32px 20px">
         <button class="lp-desc-toggle" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#64748b;font-size:12px;font-weight:600;padding:8px 0">
           <svg class="lp-desc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition:transform 0.2s;${isLong ? '' : 'transform:rotate(90deg)'}"><polyline points="9 18 15 12 9 6"/></svg>
           Learning Notes
         </button>
         <div class="lp-desc-body" style="overflow:hidden;transition:max-height 0.3s ease;${isLong ? 'max-height:0' : 'max-height:2000px'}">
           <div class="lp-description" style="font-size:14px;color:#374151;line-height:1.7;border-top:1px solid #e2e8f0;padding-top:12px">
             ${html}
           </div>
         </div>
       </div>
     `
   }
   ```

2. Wire toggle in `render()` event section:
   ```javascript
   const descToggle = overlay.querySelector('.lp-desc-toggle')
   if (descToggle) {
     descToggle.addEventListener('click', () => {
       const body = overlay.querySelector('.lp-desc-body')
       const chevron = overlay.querySelector('.lp-desc-chevron')
       const isCollapsed = body.style.maxHeight === '0px' || body.style.maxHeight === '0'
       body.style.maxHeight = isCollapsed ? `${body.scrollHeight}px` : '0'
       chevron.style.transform = isCollapsed ? 'rotate(90deg)' : ''
     })
   }
   ```

### B. Visual Hierarchy

3. Add a subtle background to the description area:
   - Description panel gets `background:#fafbfc` with rounded bottom corners
   - Content title area gets slightly larger font (22px instead of 20px)
   - Add a small "Learning Notes" label above the description (already in toggle button text)

4. Improve the content title section across all types:
   ```javascript
   // Consistent title block for video and PDF:
   <div style="padding:24px 32px">
     <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
       <span style="padding:2px 8px;background:#eef2ff;border-radius:6px;font-size:11px;font-weight:600;color:#4f46e5">${typeLabel}</span>
       <span style="font-size:12px;color:#94a3b8">${escapeHtml(item.lessonTitle)}</span>
     </div>
     <h2 style="font-size:22px;font-weight:700;color:#1e293b;margin:0">${escapeHtml(item.title)}</h2>
   </div>
   ```

### C. Sidebar Notes Tab

5. Add tab toggle at top of sidebar content area:
   ```javascript
   <div style="display:flex;border-bottom:1px solid #e2e8f0;padding:0 20px">
     <button class="lp-tab" data-tab="content" style="...">Content</button>
     <button class="lp-tab" data-tab="notes" style="...">Notes</button>
   </div>
   ```

6. Create notes list HTML:
   ```javascript
   function renderNotesTab() {
     const itemsWithNotes = allItems.filter(i => i.description?.trim())
     if (itemsWithNotes.length === 0) {
       return '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">No notes in this course yet</div>'
     }
     return itemsWithNotes.map(item => {
       const preview = item.description.replace(/[#*_\[\]()]/g, '').substring(0, 60)
       const idx = allItems.findIndex(i => i.id === item.id)
       return `
         <button class="lp-note-item" data-idx="${idx}" style="display:block;width:100%;text-align:left;padding:10px 20px;border:none;background:transparent;cursor:pointer;border-bottom:1px solid #f1f5f9">
           <div style="font-size:12px;font-weight:600;color:#1e293b">${escapeHtml(item.title)}</div>
           <div style="font-size:11px;color:#94a3b8;margin-top:2px">${escapeHtml(preview)}...</div>
         </button>
       `
     }).join('')
   }
   ```

7. Wire tab switching and note clicking:
   ```javascript
   overlay.querySelectorAll('.lp-tab').forEach(tab => {
     tab.addEventListener('click', () => {
       // Toggle between content list and notes list
     })
   })
   overlay.querySelectorAll('.lp-note-item').forEach(btn => {
     btn.addEventListener('click', () => {
       currentIndex = parseInt(btn.dataset.idx)
       // Switch back to content tab
       render()
     })
   })
   ```

## Todo
- [x] Implement collapsible description panel
- [x] Wire toggle expand/collapse with animation
- [x] Improve content title visual hierarchy
- [x] Add sidebar tab toggle (Content / Notes)
- [x] Implement notes list with previews
- [x] Wire note click → navigate to content item
- [x] Verify expand/collapse animation is smooth
- [x] Verify file stays under ~350 lines (or extract sidebar into helper)
- [x] Run build, manual test

## Success Criteria
- Long descriptions start collapsed; short ones start expanded
- Clicking "Learning Notes" toggle expands/collapses smoothly
- Sidebar has Content/Notes tabs
- Notes tab shows all items with descriptions, clicking navigates to that item
- Visual hierarchy is cleaner: type badge, lesson breadcrumb, larger title
- No regressions in existing player functionality

## Risk Assessment
- **Risk**: File exceeds 350 lines → Mitigation: extract sidebar rendering into `lesson-player-sidebar.js` helper if needed
- **Risk**: max-height animation jank with dynamic content → Mitigation: use `scrollHeight` for accurate max-height calculation
- **Risk**: Tab state lost on render() → Mitigation: track `activeTab` in closure state, persist across renders

## Security Considerations
- No new security concerns — this phase only rearranges how already-sanitized content is displayed.

## Next Steps
- After all 6 phases: run full build, manual E2E test through the create → edit → view → download flow
- Consider future enhancement: admin preview mode showing how descriptions will look to students
