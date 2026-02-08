/**
 * LoginView.js
 * Login page that replaces the main app when not authenticated
 */

import { authManager } from './AuthManager.js';

export function renderLoginView(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <h1>Chess Quiz Composer</h1>
          <p>Sign in to continue</p>
        </div>

        <form id="login-form" class="login-form">
          <div class="login-field">
            <label for="login-username">Username</label>
            <input
              type="text"
              id="login-username"
              name="username"
              autocomplete="username"
              required
              autofocus
            />
          </div>

          <div class="login-field">
            <label for="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              name="password"
              autocomplete="current-password"
              required
            />
          </div>

          <div id="login-error" class="login-error" style="display: none;"></div>

          <button type="submit" class="login-submit" id="login-submit-btn">
            Sign In
          </button>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const errorEl = container.querySelector('#login-error');
  const submitBtn = container.querySelector('#login-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';

    const username = form.querySelector('#login-username').value.trim();
    const password = form.querySelector('#login-password').value;

    if (!username || !password) {
      errorEl.textContent = 'Please enter both username and password';
      errorEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const user = await authManager.login(username, password);
      onLoginSuccess(user);
    } catch (error) {
      errorEl.textContent = error.message || 'Login failed. Please try again.';
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
}
