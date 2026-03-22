/**
 * LoginView.js
 * Two-panel login page: brand panel (left) + form panel (right)
 */

import { authManager } from './AuthManager.js'

export function renderLoginView(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="login-page">
      <div class="login-brand-panel">
        <div class="login-brand-content">
          <div class="login-brand-icon">&#9819;</div>
          <h1 class="login-brand-title">Chess Quiz Composer</h1>
          <p class="login-brand-desc">Create, manage, and assign chess puzzles for your students. Track progress and improve chess skills systematically.</p>
          <div class="login-features">
            <div class="login-feature">
              <span class="login-feature-icon">&#9823;</span>
              <span>Generate puzzles from 3M+ positions</span>
            </div>
            <div class="login-feature">
              <span class="login-feature-icon">&#9822;</span>
              <span>Assign exercises to students by skill</span>
            </div>
            <div class="login-feature">
              <span class="login-feature-icon">&#9821;</span>
              <span>Track performance and grade results</span>
            </div>
          </div>
        </div>
      </div>
      <div class="login-form-panel">
        <div class="login-form-content">
          <div class="login-mobile-brand">
            <div class="login-mobile-icon">&#9819;</div>
            <h1 class="login-mobile-title">Chess Quiz</h1>
            <p class="login-mobile-desc">Create, manage, and assign chess puzzles</p>
          </div>
          <h2 class="login-form-title">Welcome back</h2>
          <p class="login-form-subtitle">Sign in to your account to continue</p>

          <form id="login-form" class="login-form">
            <div class="login-field">
              <label for="login-username">Username</label>
              <input type="text" id="login-username" name="username" autocomplete="username" placeholder="Enter your username" required autofocus />
            </div>
            <div class="login-field">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" name="password" autocomplete="current-password" placeholder="Enter your password" required />
            </div>
            <div id="login-error" class="login-error" style="display: none;"></div>
            <button type="submit" class="login-submit" id="login-submit-btn">Sign In</button>
          </form>
        </div>
      </div>
    </div>
  `

  const form = container.querySelector('#login-form')
  const errorEl = container.querySelector('#login-error')
  const submitBtn = container.querySelector('#login-submit-btn')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.style.display = 'none'

    const username = form.querySelector('#login-username').value.trim()
    const password = form.querySelector('#login-password').value

    if (!username || !password) {
      errorEl.textContent = 'Please enter both username and password'
      errorEl.style.display = 'block'
      return
    }

    submitBtn.disabled = true
    submitBtn.textContent = 'Signing in...'

    try {
      const user = await authManager.login(username, password)
      onLoginSuccess(user)
    } catch (error) {
      errorEl.textContent = error.message || 'Login failed. Please try again.'
      errorEl.style.display = 'block'
      submitBtn.disabled = false
      submitBtn.textContent = 'Sign In'
    }
  })
}
