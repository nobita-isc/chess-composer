/**
 * theme-multi-select.js
 * Searchable multi-select dropdown for chess themes.
 * Renders selected themes as tags with remove buttons.
 */

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Create a multi-select theme picker inside a container element.
 * @param {HTMLElement} containerEl - Element to render into
 * @param {Array<{theme: string, count: number, category: string, label: string}>} themes - Available themes
 * @returns {{ getSelected: () => string[], destroy: () => void }}
 */
export function createThemeMultiSelect(containerEl, themes) {
  const selected = new Set()
  let isOpen = false

  containerEl.innerHTML = `
    <div class="tms-wrap">
      <div class="tms-input-area">
        <div class="tms-tags" id="tms-tags"></div>
        <input type="text" class="tms-search" id="tms-search" placeholder="Search themes..." autocomplete="off" />
      </div>
      <div class="tms-dropdown" id="tms-dropdown" style="display:none"></div>
    </div>
  `

  const tagsEl = containerEl.querySelector('#tms-tags')
  const searchInput = containerEl.querySelector('#tms-search')
  const dropdown = containerEl.querySelector('#tms-dropdown')

  function renderTags() {
    if (selected.size === 0) {
      tagsEl.innerHTML = ''
      searchInput.placeholder = 'Search themes... (leave empty for all)'
      return
    }
    searchInput.placeholder = 'Add more...'
    tagsEl.innerHTML = [...selected].map(t => {
      const theme = themes.find(th => th.theme === t)
      const label = theme ? theme.label : t
      return `<span class="tms-tag">${escapeHtml(label)}<button class="tms-tag-remove" data-theme="${escapeHtml(t)}">&times;</button></span>`
    }).join('')

    tagsEl.querySelectorAll('.tms-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        selected.delete(btn.dataset.theme)
        renderTags()
        renderDropdown(searchInput.value)
      })
    })
  }

  function renderDropdown(filter = '') {
    const query = filter.toLowerCase().trim()
    const grouped = {}

    themes.forEach(t => {
      if (selected.has(t.theme)) return
      if (query && !t.label.toLowerCase().includes(query) && !t.theme.toLowerCase().includes(query)) return
      if (!grouped[t.category]) grouped[t.category] = []
      grouped[t.category].push(t)
    })

    const categories = Object.keys(grouped)
    if (categories.length === 0) {
      dropdown.innerHTML = '<div class="tms-empty">No matching themes</div>'
      return
    }

    dropdown.innerHTML = categories.map(cat => `
      <div class="tms-group">
        <div class="tms-group-label">${escapeHtml(cat)}</div>
        ${grouped[cat].map(t => `
          <button class="tms-option" data-theme="${escapeHtml(t.theme)}">
            <span>${escapeHtml(t.label)}</span>
            <span class="tms-count">${t.count.toLocaleString()}</span>
          </button>
        `).join('')}
      </div>
    `).join('')

    dropdown.querySelectorAll('.tms-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        selected.add(btn.dataset.theme)
        searchInput.value = ''
        renderTags()
        renderDropdown('')
        searchInput.focus()
      })
    })
  }

  function openDropdown() {
    if (isOpen) return
    isOpen = true
    dropdown.style.display = 'block'
    renderDropdown(searchInput.value)
  }

  function closeDropdown() {
    if (!isOpen) return
    isOpen = false
    dropdown.style.display = 'none'
  }

  searchInput.addEventListener('focus', openDropdown)
  searchInput.addEventListener('input', () => {
    openDropdown()
    renderDropdown(searchInput.value)
  })

  // Close on outside click
  const outsideClickHandler = (e) => {
    if (!containerEl.contains(e.target)) closeDropdown()
  }
  document.addEventListener('click', outsideClickHandler)

  // Backspace removes last tag
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && searchInput.value === '' && selected.size > 0) {
      const last = [...selected].pop()
      selected.delete(last)
      renderTags()
      renderDropdown('')
    }
    if (e.key === 'Escape') closeDropdown()
  })

  // Click on input area opens dropdown
  containerEl.querySelector('.tms-input-area').addEventListener('click', () => {
    searchInput.focus()
  })

  renderTags()

  return {
    getSelected: () => [...selected],
    destroy: () => document.removeEventListener('click', outsideClickHandler)
  }
}
