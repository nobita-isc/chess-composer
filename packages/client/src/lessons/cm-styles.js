/**
 * cm-styles.js
 * Shared inline <style> block for the Course Management workspace.
 * Kept separate from CourseManagementPage.js so the orchestrator stays under the 200-line cap.
 */

export const CM_STYLES = `<style>
.cm-workspace{display:flex;flex-direction:column;height:100%;min-height:0;font-family:inherit;background:#f8fafc}
.cm-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 20px;border-bottom:1px solid #e2e8f0;background:#fff;flex-shrink:0}
.cm-breadcrumb{display:flex;align-items:center;gap:4px;min-width:0;flex:1}
.cm-bc-seg{background:none;border:none;cursor:pointer;font-size:13px;color:#64748b;padding:2px 6px;border-radius:4px;font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}
.cm-bc-seg:hover{background:#f1f5f9;color:#1e293b}
.cm-bc-seg.cm-bc-active{color:#0f172a;font-weight:600;cursor:default}
.cm-bc-seg.cm-bc-active:hover{background:none}
.cm-bc-sep{color:#cbd5e1;font-size:12px;user-select:none}
.cm-topbar-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.cm-create-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:7px 13px;border-radius:7px;border:1px solid #e2e8f0;background:#fff;color:#334155;cursor:pointer;font-family:inherit;line-height:1;transition:all .12s}
.cm-create-btn:hover{background:#f8fafc;border-color:#cbd5e1;color:#0f172a}
.cm-body{display:flex;flex:1;min-height:0;overflow:hidden}
.cm-pane{overflow-y:auto;display:flex;flex-direction:column;min-width:0}
.cm-pane-courses{width:260px;flex-shrink:0;border-right:1px solid #e2e8f0;background:#fff}
.cm-pane-lessons{width:280px;flex-shrink:0;border-right:1px solid #e2e8f0;background:#fff}
.cm-pane-editor{flex:1;background:#f8fafc;overflow-y:auto}
.cm-splitter{width:4px;flex-shrink:0;cursor:col-resize;background:transparent;transition:background 0.15s}
.cm-splitter:hover{background:#e2e8f0}
.cm-pane-header{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid #f1f5f9;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em;flex-shrink:0;background:#fff;position:sticky;top:0;z-index:1}
.cm-pane-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cm-add-btn{width:22px;height:22px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;color:#64748b;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:all .12s}
.cm-add-btn:hover{background:#f1f5f9;color:#0f172a;border-color:#cbd5e1}
.cm-course-list,.cm-lesson-list{list-style:none;margin:0;padding:4px 0}
.cm-course-item,.cm-lesson-item{position:relative}
.cm-course-row,.cm-lesson-row{display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;transition:background .1s;border-left:2px solid transparent}
.cm-course-row:hover,.cm-lesson-row:hover{background:#f8fafc}
.cm-course-item.cm-selected .cm-course-row,.cm-lesson-item.cm-selected .cm-lesson-row{background:#f1f5f9;border-left-color:#4f46e5}
.cm-course-info{flex:1;display:flex;align-items:center;gap:8px;min-width:0}
.cm-skill-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;background:#94a3b8}
.cm-skill-dot.cm-skill-beginner{background:#10b981}
.cm-skill-dot.cm-skill-intermediate{background:#f59e0b}
.cm-skill-dot.cm-skill-advanced{background:#ef4444}
.cm-course-title,.cm-lesson-title{font-size:13px;font-weight:500;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
.cm-course-meta,.cm-lesson-meta{font-size:11px;color:#94a3b8;flex-shrink:0}
.cm-course-actions,.cm-lesson-actions{display:none;align-items:center;gap:2px;position:absolute;right:8px;top:50%;transform:translateY(-50%);background:linear-gradient(90deg,transparent,#f8fafc 30%);padding-left:18px}
.cm-course-item:hover .cm-course-actions,.cm-lesson-item:hover .cm-lesson-actions{display:flex}
.cm-course-item.cm-selected:hover .cm-course-actions,.cm-lesson-item.cm-selected:hover .cm-lesson-actions{background:linear-gradient(90deg,transparent,#f1f5f9 30%)}
.cm-icon-btn{width:24px;height:24px;border:none;background:none;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#64748b}
.cm-icon-btn:hover{background:#e2e8f0;color:#1e293b}
.cm-icon-btn-danger:hover{background:#fee2e2;color:#ef4444}
.cm-lesson-row{align-items:center}
.cm-lesson-index{width:18px;font-size:11px;font-weight:500;color:#cbd5e1;flex-shrink:0;text-align:right;font-variant-numeric:tabular-nums}
.cm-lesson-item.cm-selected .cm-lesson-index{color:#64748b}
.cm-lesson-info{flex:1;display:flex;align-items:center;gap:8px;min-width:0}
.cm-editor-shell{padding:24px 28px;display:flex;flex-direction:column;gap:18px;max-width:880px;margin:0 auto}
.cm-editor-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:100%;color:#94a3b8;font-size:13px;text-align:center;padding:40px}
.cm-empty-state{padding:40px 16px;text-align:center;color:#94a3b8;font-size:13px}
.cm-loading{padding:20px 16px;text-align:center;color:#94a3b8;font-size:13px}
.cm-error{padding:16px;color:#ef4444;font-size:13px}
.cm-meta-strip{display:flex;align-items:center;gap:14px;font-size:12px;color:#94a3b8;padding:2px 0;flex-wrap:wrap}
.cm-meta-strip strong{font-weight:600;color:#64748b}
.cm-add-content-bar{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.cm-add-content-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;background:#fff;border:1px solid #e2e8f0;border-radius:7px;cursor:pointer;font-size:12px;font-weight:500;color:#475569;font-family:inherit;line-height:1;transition:all .12s}
.cm-add-content-btn:hover{background:#f8fafc;border-color:#cbd5e1;color:#0f172a}
.cm-add-content-btn .cm-acb-icon{font-size:13px;line-height:1}
.cm-add-content-btn.cm-acb-video .cm-acb-icon{color:#4f46e5}
.cm-add-content-btn.cm-acb-pdf .cm-acb-icon{color:#b45309}
.cm-add-content-btn.cm-acb-quiz .cm-acb-icon{color:#dc2626}
.cm-add-content-btn.cm-acb-puzzle .cm-acb-icon{color:#059669}
.ci-card{border:1px solid #e2e8f0;border-radius:9px;background:#fff;overflow:hidden;margin-bottom:8px;transition:border-color .12s,box-shadow .12s;position:relative}
.ci-card:hover{border-color:#cbd5e1;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.ci-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:transparent;transition:background .12s}
.ci-card.ci-video::before{background:#c7d2fe}
.ci-card.ci-pdf::before{background:#fcd34d}
.ci-card.ci-quiz::before{background:#fca5a5}
.ci-card.ci-puzzle::before{background:#86efac}
.ci-type-tag{font-size:10px;font-weight:600;letter-spacing:.08em;color:#94a3b8;text-transform:uppercase;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;flex-shrink:0}
.ci-type-icon{font-size:14px;line-height:1;width:18px;text-align:center;flex-shrink:0;color:#64748b}
.ci-card.ci-video .ci-type-icon{color:#4f46e5}
.ci-card.ci-pdf .ci-type-icon{color:#b45309}
.ci-card.ci-quiz .ci-type-icon{color:#dc2626}
.ci-card.ci-puzzle .ci-type-icon{color:#059669}
@media(max-width:768px){
  .cm-body{flex-direction:column}
  .cm-splitter{display:none}
  .cm-pane-courses,.cm-pane-lessons{width:100%!important;border-right:none;border-bottom:1px solid #e2e8f0}
  .cm-pane-editor{min-height:300px}
  .cm-course-actions,.cm-lesson-actions{display:flex;background:none;padding-left:0}
}
</style>`
