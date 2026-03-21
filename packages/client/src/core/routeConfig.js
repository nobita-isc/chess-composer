/**
 * routeConfig.js
 * Route definitions and guard functions for admin and student roles.
 */

import { authManager } from '../auth/AuthManager.js'

export const ADMIN_DEFAULT_PATH = '/generate'
export const STUDENT_DEFAULT_PATH = '/my-exercises'
export const LOGIN_PATH = '/login'

const SIDEBAR_MAP = {
  generate: 'nav-generate',
  exercises: 'exercises-btn',
  reports: 'admin-btn',
  users: 'users-btn'
}

export function updateSidebarActive(routeName) {
  Object.values(SIDEBAR_MAP).forEach(id => {
    const el = document.getElementById(id)
    if (el) el.classList.remove('active')
  })

  const activeId = SIDEBAR_MAP[routeName]
  if (activeId) {
    const el = document.getElementById(activeId)
    if (el) el.classList.add('active')
  }
}

export function authGuard() {
  return authManager.isAuthenticated() ? true : LOGIN_PATH
}

export function adminGuard() {
  return authManager.isAdmin() ? true : STUDENT_DEFAULT_PATH
}

export function studentGuard() {
  return authManager.isStudent() ? true : ADMIN_DEFAULT_PATH
}

export function createAdminRoutes({ renderGenerate, renderExercises, renderReports, renderUsers }) {
  const guards = [authGuard, adminGuard]
  return [
    {
      path: '/generate',
      name: 'generate',
      render: renderGenerate,
      guards
    },
    {
      path: '/exercises',
      name: 'exercises',
      render: renderExercises,
      guards
    },
    {
      path: '/reports',
      name: 'reports',
      render: renderReports,
      guards
    },
    {
      path: '/users',
      name: 'users',
      render: renderUsers,
      guards
    }
  ]
}

export function createStudentRoutes({ renderMyExercises, renderPerformance }) {
  const guards = [authGuard, studentGuard]
  return [
    {
      path: '/my-exercises',
      name: 'my-exercises',
      render: renderMyExercises,
      guards
    },
    {
      path: '/performance',
      name: 'performance',
      render: renderPerformance,
      guards
    }
  ]
}

export function createLoginRoutes({ renderLogin }) {
  return [
    {
      path: '/login',
      name: 'login',
      render: renderLogin,
      guards: []
    }
  ]
}
