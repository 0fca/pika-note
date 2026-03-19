const apiBaseUrl = process.env.VUE_APP_API_BASE_URL || 'https://noteapi.lukas-bownik.net'

let refreshTokenInvalid = false
let refreshPromise = null

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
  const response = await fetch(input, init)

  if (response.status === 401) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      return fetch(input, init)
    }
  }

  return response
}
