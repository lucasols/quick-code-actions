// Sample JavaScript file to test Quick Code Actions extension

// Test 1: Select this function and extract
function debounce(fn, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

// Test 2: Select this function and extract
function throttle(fn, limit) {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Test 3: Select this object and extract
const validators = {
  isEmail: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  isPhone: (value) => /^\+?[\d\s-]{10,}$/.test(value),
  isRequired: (value) => value !== null && value !== undefined && value !== '',
  minLength: (min) => (value) => value.length >= min,
  maxLength: (max) => (value) => value.length <= max,
}

// Test 4: Select this async function and extract
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response
      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

// Test 5: Use "Copy Reference" on line 45 to get @utils.js#L45
const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

// Usage
const debouncedSearch = debounce((query) => console.log('Searching:', query), 300)
const throttledScroll = throttle(() => console.log('Scrolled'), 100)

export { debounce, throttle, validators, fetchWithRetry, deepClone }
