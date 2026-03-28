/**
 * app-dialogs.js
 * Reusable styled dialogs replacing native confirm(), prompt(), and alert().
 * All dialogs use the application's design system (pv-overlay + gd-confirm).
 */

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Show a styled confirmation dialog (replaces native confirm())
 * @param {object} options - { title, message, confirmLabel?, confirmColor?, icon? }
 * @returns {Promise<boolean>} - true if confirmed, false if cancelled
 */
export function showAppConfirm({ title, message, confirmLabel = 'Confirm', confirmColor = 'var(--color-brand-500)', icon = 'alert' }) {
  return new Promise((resolve) => {
    const iconSvg = {
      alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
      delete: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>',
      lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
      reset: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>'
    }

    const overlay = document.createElement('div')
    overlay.className = 'pv-overlay'
    overlay.style.zIndex = '65000'
    overlay.innerHTML = `
      <div class="gd-confirm">
        <div class="gd-confirm-icon" style="background:var(--color-error-50)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${confirmColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${iconSvg[icon] || iconSvg.alert}
          </svg>
        </div>
        <h3 class="gd-confirm-title">${escapeHtml(title)}</h3>
        <p class="gd-confirm-msg">${escapeHtml(message)}</p>
        <div class="gd-confirm-btns">
          <button class="btn-outline" data-action="cancel" style="flex:1;padding:12px">Cancel</button>
          <button class="generate-btn" data-action="confirm" style="flex:1;padding:12px;background:${confirmColor}">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `

    const close = (result) => { overlay.remove(); resolve(result) }

    document.body.appendChild(overlay)
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false))
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true))
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false) })
  })
}

/**
 * Show a styled prompt dialog with text input (replaces native prompt())
 * @param {object} options - { title, message?, placeholder?, defaultValue? }
 * @returns {Promise<string|null>} - input value or null if cancelled
 */
export function showAppPrompt({ title, message = '', placeholder = '', defaultValue = '' }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'pv-overlay'
    overlay.style.zIndex = '65000'
    overlay.innerHTML = `
      <div class="gd-confirm">
        <h3 class="gd-confirm-title">${escapeHtml(title)}</h3>
        ${message ? `<p class="gd-confirm-msg">${escapeHtml(message)}</p>` : ''}
        <input type="text" id="app-prompt-input" class="app-prompt-input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}" style="width:100%;padding:10px 12px;border:1px solid var(--color-gray-200);border-radius:var(--radius-md);font-size:14px;margin:8px 0 16px;box-sizing:border-box" />
        <div class="gd-confirm-btns">
          <button class="btn-outline" data-action="cancel" style="flex:1;padding:12px">Cancel</button>
          <button class="generate-btn" data-action="confirm" style="flex:1;padding:12px">OK</button>
        </div>
      </div>
    `

    const close = (result) => { overlay.remove(); resolve(result) }

    document.body.appendChild(overlay)
    const input = overlay.querySelector('#app-prompt-input')
    input.focus()
    input.select()

    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(null))
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      const value = input.value.trim()
      close(value || null)
    })
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null) })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = input.value.trim()
        close(value || null)
      }
      if (e.key === 'Escape') close(null)
    })
  })
}

/**
 * Show a styled alert dialog (replaces native alert())
 * @param {object} options - { title, message }
 * @returns {Promise<void>}
 */
export function showAppAlert({ title, message }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'pv-overlay'
    overlay.style.zIndex = '65000'
    overlay.innerHTML = `
      <div class="gd-confirm">
        <h3 class="gd-confirm-title">${escapeHtml(title)}</h3>
        <p class="gd-confirm-msg">${escapeHtml(message)}</p>
        <div class="gd-confirm-btns">
          <button class="generate-btn" data-action="ok" style="flex:1;padding:12px">OK</button>
        </div>
      </div>
    `

    document.body.appendChild(overlay)
    overlay.querySelector('[data-action="ok"]').addEventListener('click', () => { overlay.remove(); resolve() })
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve() } })
  })
}
