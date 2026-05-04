/**
 * debounce.js — Returns a debounced version of fn that delays invocation by wait ms.
 * Exposes cancel() to discard a pending call and flush() to invoke immediately if pending.
 */
export function debounce(fn, wait) {
  let timer = null
  let lastArgs = null

  function debounced(...args) {
    lastArgs = args
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...lastArgs)
    }, wait)
  }

  debounced.cancel = () => {
    clearTimeout(timer)
    timer = null
  }

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
      fn(...lastArgs)
    }
  }

  return debounced
}
