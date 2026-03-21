import { authFetch } from "@/services/fetchClient";

const apiBaseUrl = process.env.VUE_APP_API_BASE_URL || 'https://noteapi.lukas-bownik.net'

let cachedTools = null
let cacheExpiry = 0
const CACHE_DURATION_MS = 5 * 60 * 1000

export async function getAvailableTools() {
    const now = Date.now()
    if (cachedTools && now < cacheExpiry) {
        return cachedTools
    }

    try {
        const response = await authFetch(`${apiBaseUrl}/ChatTool/Available`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' },
        })

        if (!response.ok) {
            return cachedTools || []
        }

        const data = await response.json()
        cachedTools = data.tools || []
        cacheExpiry = now + CACHE_DURATION_MS
        return cachedTools
    } catch {
        return cachedTools || []
    }
}

export function isToolAvailable(toolName, tools) {
    if (!toolName) return true
    return tools.some(t => t.name.toLowerCase() === toolName.toLowerCase())
}
