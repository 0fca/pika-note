const apiBaseUrl = process.env.VUE_APP_API_BASE_URL || 'https://noteapi.lukas-bownik.net'

let refreshTokenInvalid = false
let refreshPromise = null
const MAX_REQUEST_ATTEMPTS = 3
const refreshableStatuses = new Set([401, 403])
const retryableStatuses = new Set([400, 401, 403, 422, 500])

async function tryRefreshToken() {
  if (refreshTokenInvalid) return false
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
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
      const response = await fetch(input, requestInit)

      if (response.ok) {
        return response
      }

      if (refreshableStatuses.has(response.status) && attempt < MAX_REQUEST_ATTEMPTS) {
        const refreshed = await tryRefreshToken()
        if (refreshed || !refreshTokenInvalid) {
          continue
        }
      } else if ((retryOnAnyFailure || retryableStatuses.has(response.status)) && attempt < MAX_REQUEST_ATTEMPTS) {
        continue
      }

      return response
    } catch (error) {
      if (attempt === MAX_REQUEST_ATTEMPTS) {
        throw error
      }
    }
  }

  throw new Error('Request failed')
}
