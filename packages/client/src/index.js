/**
 * Chess Trainer Composer - Bootstrap Entry Point
 *
 * Initializes auth, determines user role, sets up hash-based routing.
 */

import { apiClient } from './api/ApiClient.js'
import { renderAdminPage } from './reports/AdminPanel.js'
import { renderExercisePage } from './exercises/ExercisePanel.js'
import { authManager } from './auth/AuthManager.js'
import { renderLoginView } from './auth/LoginView.js'
import { renderStudentDashboard } from './auth/StudentDashboard.js'
import { renderUsersPage } from './auth/UserManagementPanel.js'
import { renderCoursesPage } from './lessons/CourseManagementPage.js'
import { HashRouter } from './core/HashRouter.js'
import {
  createAdminRoutes,
  createStudentRoutes,
  createLoginRoutes,
  updateSidebarActive,
  ADMIN_DEFAULT_PATH,
  STUDENT_DEFAULT_PATH,
  LOGIN_PATH
} from './core/routeConfig.js'
import { ChessQuizComposer } from './views/GenerateView.js'
import { initSyncManager } from './shared/sync-manager.js'

function escapeHtmlAttr(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

document.addEventListener('DOMContentLoaded', async () => {
  apiClient.setAuthManager(authManager)

  // Initialize offline sync manager
  initSyncManager(() => authManager.getAccessToken())

  // Unauthenticated: show login
  if (!authManager.isAuthenticated()) {
    const loginRoutes = createLoginRoutes({
      renderLogin: (container) => {
        return renderLoginView(container, () => {
          window.location.hash = ''
          window.location.reload()
        })
      }
    })

    const appLayout = document.querySelector('.app-layout')
    if (appLayout) {
      appLayout.innerHTML = '<div class="container"></div>'
      appLayout.style.display = 'block'
    }

    const router = new HashRouter({
      routes: loginRoutes,
      onNavigate: ({ route }) => {
        const container = document.querySelector('.container')
        if (container) route.render(container)
      },
      defaultPath: LOGIN_PATH
    })
    router.start()
    return
  }

  const user = authManager.getCurrentUser()

  // Student flow
  if (user.role === 'student') {
    const appLayout = document.querySelector('.app-layout')
    if (appLayout) {
      appLayout.innerHTML = '<div class="student-container"></div>'
      appLayout.style.display = 'block'
    }

    let currentCleanup = null

    const studentRoutes = createStudentRoutes({
      renderMyExercises: (container) => {
        return renderStudentDashboard(container, apiClient, { initialTab: 'exercises' })
      },
      renderCourses: (container) => {
        return renderStudentDashboard(container, apiClient, { initialTab: 'courses' })
      },
      renderPerformance: (container) => {
        return renderStudentDashboard(container, apiClient, { initialTab: 'performance' })
      }
    })

    const router = new HashRouter({
      routes: studentRoutes,
      onNavigate: ({ route }) => {
        if (currentCleanup && typeof currentCleanup === 'function') {
          try { currentCleanup() } catch { /* cleanup error */ }
        }
        const container = document.querySelector('.student-container')
        if (container) {
          container.innerHTML = ''
          currentCleanup = route.render(container) || null
        }
      },
      defaultPath: STUDENT_DEFAULT_PATH
    })
    router.start()
    return
  }

  // Admin flow: set up sidebar
  const sidebarFooter = document.getElementById('sidebar-footer')
  if (sidebarFooter) {
    const initial = (user.username || 'A').charAt(0).toUpperCase()
    sidebarFooter.innerHTML = `
      <div class="sidebar-user">
        <div class="sidebar-avatar">${escapeHtmlAttr(initial)}</div>
        <div>
          <div class="sidebar-username">${escapeHtmlAttr(user.username)}</div>
          <div class="sidebar-role">Admin</div>
        </div>
      </div>
      <button id="logout-btn" class="sidebar-logout-btn" title="Logout">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span class="sidebar-label">Logout</span>
      </button>
    `
    document.getElementById('logout-btn').addEventListener('click', () => authManager.logout())
  }

  // Add Users nav item
  const dynamicNav = document.getElementById('sidebar-dynamic-nav')
  if (dynamicNav) {
    const usersBtn = document.createElement('button')
    usersBtn.id = 'users-btn'
    usersBtn.className = 'sidebar-nav-item'
    usersBtn.title = 'User Management'
    usersBtn.innerHTML = `
      <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      <span class="sidebar-label">Users</span>
    `
    dynamicNav.appendChild(usersBtn)
  }

  // Initialize puzzle generator
  const app = new ChessQuizComposer()
  await app.initialize()
  window.chessApp = app

  // Set up hash router
  const generateView = document.getElementById('view-generate')
  const viewContainer = document.getElementById('view-container')
  let currentCleanup = null

  const adminRoutes = createAdminRoutes({
    renderGenerate: () => null, // special case: show/hide static DOM
    renderExercises: (container) => {
      return renderExercisePage(
        container,
        apiClient,
        () => app.puzzles,
        (newPuzzles) => { app.puzzles = newPuzzles }
      )
    },
    renderReports: (container) => renderAdminPage(container, apiClient),
    renderCourses: (container) => renderCoursesPage(container, apiClient),
    renderUsers: (container) => renderUsersPage(container, apiClient)
  })

  const router = new HashRouter({
    routes: adminRoutes,
    onNavigate: ({ route }) => {
      // Cleanup previous view
      if (currentCleanup && typeof currentCleanup === 'function') {
        try { currentCleanup() } catch { /* cleanup error */ }
        currentCleanup = null
      }

      updateSidebarActive(route.name)

      // Generate view: show/hide static DOM element
      if (route.name === 'generate') {
        generateView.style.display = ''
        viewContainer.style.display = 'none'
        // Redraw boards after un-hiding
        requestAnimationFrame(() => {
          app.boardInstances.forEach(inst => {
            if (inst?.board?.redrawAll) inst.board.redrawAll()
          })
        })
        return
      }

      // All other views: hide generate, render into container
      generateView.style.display = 'none'
      viewContainer.style.display = ''
      viewContainer.innerHTML = ''
      currentCleanup = route.render(viewContainer) || null
      window.scrollTo(0, 0)
    },
    defaultPath: ADMIN_DEFAULT_PATH
  })

  // Wire sidebar nav buttons to router
  const navMap = {
    'nav-generate': '/generate',
    'exercises-btn': '/exercises',
    'nav-courses': '/courses',
    'admin-btn': '/reports',
    'users-btn': '/users'
  }

  Object.entries(navMap).forEach(([btnId, path]) => {
    const btn = document.getElementById(btnId)
    if (btn) {
      btn.addEventListener('click', () => router.navigate(path))
    }
  })

  router.start()
})
