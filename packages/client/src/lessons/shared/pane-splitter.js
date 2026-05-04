/**
 * pane-splitter.js
 * Reusable drag-to-resize splitter extracted from lesson-player.js.
 * Exports two APIs:
 *   - createSplitter({ axis, target, lsKey, min, max, defaultPx }) — high-level, manages target element width/height + localStorage
 *   - attachSplitterRaw(el, { axis, onDrag, getStartSize, onEnd, onReset }) — low-level callback API (used by lesson-player for custom logic)
 */

/**
 * Low-level splitter attachment — identical to the original lesson-player helper.
 * Calls onDrag(delta, startSize) on mousemove, onEnd on mouseup, onReset on dblclick.
 * @param {HTMLElement} el - the drag handle element
 * @param {{ axis: 'x'|'y', onDrag: Function, getStartSize: Function, onEnd?: Function, onReset?: Function }} opts
 */
export function attachSplitterRaw(el, { axis, onDrag, getStartSize, onEnd, onReset }) {
  if (!el) return
  const hoverEnter = () => { el.style.background = 'rgba(79, 70, 229, 0.18)' }
  const hoverLeave = () => { el.style.background = 'transparent' }
  el.addEventListener('mouseenter', hoverEnter)
  el.addEventListener('mouseleave', hoverLeave)
  el.addEventListener('dblclick', () => onReset?.())
  el.addEventListener('mousedown', (e) => {
    e.preventDefault()
    const start = axis === 'x' ? e.clientX : e.clientY
    const startSize = getStartSize()
    const prevUserSelect = document.body.style.userSelect
    const prevCursor = document.body.style.cursor
    document.body.style.userSelect = 'none'
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
    el.style.background = 'rgba(79, 70, 229, 0.28)'
    const move = (ev) => {
      const delta = (axis === 'x' ? ev.clientX : ev.clientY) - start
      onDrag(delta, startSize)
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      document.body.style.userSelect = prevUserSelect
      document.body.style.cursor = prevCursor
      hoverLeave()
      onEnd?.()
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  })
}

/**
 * @param {Object} opts
 * @param {'x'|'y'} opts.axis
 * @param {HTMLElement} opts.target - pane element whose width/height is controlled
 * @param {string} opts.lsKey - localStorage key
 * @param {number} opts.min
 * @param {number} opts.max
 * @param {number} opts.defaultPx
 * @returns {{ attach: (handleEl: HTMLElement) => void, getSize: () => number, setSize: (px: number) => void }}
 */
export function createSplitter({ axis, target, lsKey, min, max, defaultPx }) {
  const stored = parseInt(localStorage.getItem(lsKey), 10)
  let size = (stored && stored >= min && stored <= max) ? stored : defaultPx

  function clamp(v) { return Math.min(max, Math.max(min, v)) }

  function applySize(px) {
    size = px
    if (!target) return
    if (axis === 'x') {
      target.style.width = `${px}px`
      target.style.flexShrink = '0'
    } else {
      target.style.height = `${px}px`
      target.style.flexShrink = '0'
    }
  }

  function persist() { localStorage.setItem(lsKey, String(size)) }

  function reset() {
    applySize(defaultPx)
    persist()
  }

  function attach(el) {
    if (!el) return

    const hoverIn = () => { el.style.background = 'rgba(79,70,229,0.18)' }
    const hoverOut = () => { el.style.background = 'transparent' }

    el.addEventListener('mouseenter', hoverIn)
    el.addEventListener('mouseleave', hoverOut)
    el.addEventListener('dblclick', reset)

    el.addEventListener('mousedown', (e) => {
      e.preventDefault()
      const startCoord = axis === 'x' ? e.clientX : e.clientY
      const startSize = size
      const prevSelect = document.body.style.userSelect
      const prevCursor = document.body.style.cursor

      document.body.style.userSelect = 'none'
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
      el.style.background = 'rgba(79,70,229,0.28)'

      const onMove = (ev) => {
        const delta = (axis === 'x' ? ev.clientX : ev.clientY) - startCoord
        applySize(clamp(startSize + delta))
      }

      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        document.body.style.userSelect = prevSelect
        document.body.style.cursor = prevCursor
        hoverOut()
        persist()
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    })

    // Apply initial size on attach
    applySize(size)
  }

  return {
    attach,
    getSize: () => size,
    setSize: (px) => { applySize(clamp(px)); persist() },
    reset
  }
}
