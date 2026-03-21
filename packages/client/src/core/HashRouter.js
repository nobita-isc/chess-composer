/**
 * HashRouter.js
 * Lightweight hash-based router for vanilla JS SPA.
 * Listens to hashchange events and resolves routes with guard support.
 */

export class HashRouter {
  /**
   * @param {Object} config
   * @param {Array<Route>} config.routes - Route definitions
   * @param {Function} config.onNavigate - Called on route change: ({ route, previousRoute }) => void
   * @param {string} config.defaultPath - Fallback when no route matches
   */
  constructor({ routes, onNavigate, defaultPath }) {
    this.routes = routes
    this.onNavigate = onNavigate
    this.defaultPath = defaultPath
    this.currentRoute = null
    this._onHashChange = this._handleHashChange.bind(this)
  }

  start() {
    window.addEventListener('hashchange', this._onHashChange)
    this._handleHashChange()
  }

  navigate(path) {
    const newHash = `#${path}`
    if (window.location.hash === newHash) {
      this._handleHashChange()
      return
    }
    window.location.hash = path
  }

  getCurrentRoute() {
    return this.currentRoute
  }

  destroy() {
    window.removeEventListener('hashchange', this._onHashChange)
  }

  _handleHashChange() {
    const path = this._getCurrentPath()
    const resolved = this._resolve(path)

    if (!resolved) {
      window.location.hash = this.defaultPath
      return
    }

    if (resolved.redirectTo) {
      window.location.hash = resolved.redirectTo
      return
    }

    const previousRoute = this.currentRoute
    this.currentRoute = resolved.route

    if (typeof this.onNavigate === 'function') {
      this.onNavigate({ route: resolved.route, previousRoute })
    }
  }

  _getCurrentPath() {
    const hash = window.location.hash
    return hash ? hash.replace(/^#/, '') : ''
  }

  _resolve(path, depth = 0) {
    if (depth > 3) return null

    const route = this.routes.find(r => r.path === path)
    if (!route) return null

    if (Array.isArray(route.guards)) {
      for (const guard of route.guards) {
        const result = guard(route)
        if (result !== true) {
          return { redirectTo: result }
        }
      }
    }

    return { route }
  }
}
