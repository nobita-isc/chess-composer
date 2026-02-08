/**
 * ViewRouter.js
 * Simple view switching manager for navigating between full-page views.
 *
 * - The Generate view stays in the DOM (hidden/shown) to preserve puzzle state.
 * - Other views are rendered into a shared container on demand and destroyed
 *   when navigating away.
 */

export class ViewRouter {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.generateView  - The #view-generate element
   * @param {HTMLElement} opts.viewContainer - The #view-container element
   * @param {Function}    opts.getBoards     - Returns array of { board } Chessground instances
   */
  constructor({ generateView, viewContainer, getBoards }) {
    this.generateView = generateView;
    this.viewContainer = viewContainer;
    this.getBoards = getBoards;
    this.currentView = 'generate';
    this.cleanupFn = null;
  }

  /**
   * Navigate to a named view.
   *
   * @param {string}   viewName  - 'generate' | 'exercises' | 'admin' | 'users'
   * @param {Function} [renderFn] - For non-generate views: (container, ...args) => cleanupFn
   * @param {Array}    [renderArgs] - Extra args forwarded to renderFn after container
   */
  navigate(viewName, renderFn, renderArgs = []) {
    if (viewName === this.currentView) return;

    this.destroyCurrentView();

    this.updateSidebarActive(viewName);

    if (viewName === 'generate') {
      this.generateView.style.display = '';
      this.viewContainer.style.display = 'none';
      this.currentView = 'generate';
      this.redrawBoards();
      return;
    }

    this.generateView.style.display = 'none';
    this.viewContainer.style.display = '';
    this.viewContainer.innerHTML = '';
    this.currentView = viewName;

    if (typeof renderFn === 'function') {
      this.cleanupFn = renderFn(this.viewContainer, ...renderArgs) || null;
    }

    window.scrollTo(0, 0);
  }

  /**
   * Tear down the current non-generate view (if any).
   */
  destroyCurrentView() {
    if (this.cleanupFn && typeof this.cleanupFn === 'function') {
      try {
        this.cleanupFn();
      } catch (error) {
        // Cleanup errors should not block navigation
      }
    }
    this.cleanupFn = null;
    this.viewContainer.innerHTML = '';
  }

  /**
   * Toggle .active class on sidebar nav items to reflect the current view.
   */
  updateSidebarActive(viewName) {
    const mapping = {
      generate: 'nav-generate',
      exercises: 'exercises-btn',
      admin: 'admin-btn',
      users: 'users-btn'
    };

    Object.values(mapping).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });

    const activeId = mapping[viewName];
    if (activeId) {
      const el = document.getElementById(activeId);
      if (el) el.classList.add('active');
    }
  }

  /**
   * Redraw all Chessground board instances (needed after un-hiding the Generate view).
   */
  redrawBoards() {
    if (typeof this.getBoards !== 'function') return;

    const boards = this.getBoards();
    if (!Array.isArray(boards)) return;

    requestAnimationFrame(() => {
      boards.forEach(instance => {
        if (instance && instance.board && typeof instance.board.redrawAll === 'function') {
          instance.board.redrawAll();
        }
      });
    });
  }
}
