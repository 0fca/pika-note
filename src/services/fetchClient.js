const apiBaseUrl = process.env.VUE_APP_API_BASE_URL || 'https://noteapi.lukas-bownik.net'

let refreshTokenInvalid = false
let refreshPromise = null
const MAX_REQUEST_ATTEMPTS = 3
const BASE_RETRY_DELAY_MS = 750
const refreshableStatuses = new Set([401, 403])
const retryableStatuses = new Set([400, 401, 403, 422, 500, 502])
const USER_ACTIVITY_EVENT_NAME = 'pika-note:activity'

function notifyUserActivity(source) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(USER_ACTIVITY_EVENT_NAME, {
    detail: { source }
  }))
}

function waitForRetry(attempt) {
  const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
  return new Promise(resolve => setTimeout(resolve, delayMs))
}

async function tryRefreshToken() {
  if (refreshTokenInvalid) return false
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      notifyUserActivity('request')
      const response = await fetch(`${apiBaseUrl}/Security/Refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })

      if (response.status === 401) {
        refreshTokenInvalid = true
        return false
      }

      return response.ok
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function authFetch(input, init) {
  const retryOnAnyFailure = init?.retryOnAnyFailure === true
  const requestInit = { ...(init || {}) }

  delete requestInit.retryOnAnyFailure

  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt++) {
    try {
      notifyUserActivity('request')
      const response = await fetch(input, requestInit)
      const canRetry = attempt < MAX_REQUEST_ATTEMPTS

      if (response.ok) {
        return response
      }

      if (refreshableStatuses.has(response.status) && canRetry) {
        const refreshed = await tryRefreshToken()
        if (refreshed) {
          await waitForRetry(attempt)
          continue
        }
        return response
      } else if ((retryOnAnyFailure || retryableStatuses.has(response.status)) && canRetry) {
        await waitForRetry(attempt)
      }

      return response
    } catch (error) {
      if (attempt === MAX_REQUEST_ATTEMPTS) {
        throw error
      }
      await waitForRetry(attempt)
      window.location.reload(true);
    }
  }
}
