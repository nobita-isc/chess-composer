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
          <h1 class="login-brand-title">Chess Trainer Composer</h1>
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
            <h1 class="login-mobile-title">Chess Trainer</h1>
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
              <div class="password-input-wrap">
                <input type="password" id="login-password" name="password" autocomplete="current-password" placeholder="Enter your password" required />
                <button type="button" class="password-toggle" id="login-pw-toggle" title="Show password">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
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

  // Password toggle
  const pwToggle = container.querySelector('#login-pw-toggle')
  const pwInput = container.querySelector('#login-password')
  pwToggle.addEventListener('click', () => {
    const isPassword = pwInput.type === 'password'
    pwInput.type = isPassword ? 'text' : 'password'
    pwToggle.innerHTML = isPassword
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
    pwToggle.title = isPassword ? 'Hide password' : 'Show password'
  })

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
