import { authFetch } from "@/services/fetchClient";

const chatApiBaseUrl = process.env.VUE_APP_CHAT_API_URL || 'https://ai-api.lukas-bownik.net'

export default class ChatRelayService {

    async createChatSession() {
        const response = await authFetch(`${chatApiBaseUrl}/v1/Chat`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to create chat session: ${response.status}`)
        }

        const data = await response.json()
        return data.id
    }

    async initializeChatSession(sessionId) {
        const response = await authFetch(
            `${chatApiBaseUrl}/v1/Chat/initialize?sessionId=${encodeURIComponent(sessionId)}`,
            {
                method: 'POST',
                credentials: 'include',
                headers: { 'Accept': 'application/json' },
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to initialize chat session: ${response.status}`)
        }
    }

    processLines(state, onChunk, onDone) {
        const lines = state.buffer.split('\n')
        state.buffer = lines.pop() || ''

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
                const chunk = JSON.parse(trimmed)
                if (chunk.event === 'done') {
                    state.finished = true
                    if (onDone) onDone()
                    return
                }
                if (onChunk) onChunk(chunk.event, chunk.data)
            } catch {
                // skip malformed lines
            }
        }
    }

    read(reader, decoder, state, onChunk, onDone, onError) {
        reader.read().then(({ done, value }) => {
            if (done || state.finished) {
                if (!state.finished) {
                    if (state.buffer.trim()) {
                        try {
                            const chunk = JSON.parse(state.buffer.trim())
                            if (chunk.event === 'done') {
                                if (onDone) onDone()
                                return
                            }
                            if (onChunk) onChunk(chunk.event, chunk.data)
                        } catch {
                            // skip
                        }
                    }
                    if (onDone) onDone()
                }
                return
            }

            state.buffer += decoder.decode(value, { stream: true })
            this.processLines(state, onChunk, onDone)
            if (!state.finished) this.read(reader, decoder, state, onChunk, onDone, onError)
        }).catch(err => {
            if (onError) onError(err)
        })
    }


    async sendMessageAndStream(model, message, options, onChunk, onDone, onError) {
    const { tool = '', useMemory = false, stream = true, bucketId = '' } = options || {}

    try {
        const sessionId = await this.createChatSession()
        await this.initializeChatSession(sessionId)

        const response = await fetch(`${chatApiBaseUrl}/v1/ChatRelay/Message`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/x-ndjson',
            },
            body: JSON.stringify({ model, message, stream, useMemory, tool, bucketId }),
        })

        if (!response.ok) {
            throw new Error(`Chat relay returned ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        const state = { buffer: '', finished: false }
        
        this.read(reader, decoder, state, onChunk, onDone, onError)
    } catch (err) {
        if (onError) onError(err)
    }
}
}
