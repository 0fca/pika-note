import MlService from "@/services/mlService";
import UnauthorizedException from "../components/exceptions/UnauthorizedException";

export default class NoteService {
    constructor() {
        this.baseUrl = process.env.VUE_APP_API_BASE_URL || "https://noteapi.lukas-bownik.net";
    }

    async readData(url = '', method = 'GET') {
        url = this.baseUrl + url;
        const response = await fetch(url, {
                method: method,
                headers: {
                    'Origin': this.baseUrl,
                },
                credentials: 'include'
            });

        if (response.ok) {
            return response.json();
        }

        if (response.status === 401 || response.status === 403) {
            throw new UnauthorizedException();
        }

        throw new Error('Request failed');
    }

    async getNote(id) {
        const url = `/notes/${id}`;
        const rawJson = await this.readData(url);
        return rawJson.payload;
    }

    async saveNote(id, name, content, rawContent) {
        const url = `${this.baseUrl}/notes/${id}`;
        if (process.env.VUE_APP_ENV === 'production') {
            const mlService = new MlService();
            const p = await mlService.validateLanguage(name, rawContent)
            if (p.prediction >= 2) {
                throw new Error('Mind your language!')
            }
        }
        return await fetch(url, {
            method: 'PUT',
            headers: {
                'Origin': this.baseUrl,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "name": name,
                "content": content
            }),
            credentials: 'include'
        });
    }

    async addNote(bucketId, name, content, rawContent) {
        const url = `${this.baseUrl}/notes?bucketId=${bucketId}`;
        if (process.env.VUE_APP_ENV === 'production') {
            const mlService = new MlService();
            const p = await mlService.validateLanguage(name, rawContent)
            if (p.prediction >= 2) {
                throw new Error('Mind your language!')
            }
        }
        return await fetch(url, {
            method: 'POST',
            headers: {
                'Origin': this.baseUrl,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "name": name,
                "content": content
            }),
            credentials: 'include'
        });
    }

    async removeNote(id) {
        const url = `${this.baseUrl}/notes/${id}`;
        return await fetch(url, {
            method: 'DELETE',
            headers: {
                'Origin': this.baseUrl,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
    }

    async getBuckets() {
        const url = `${this.baseUrl}/notes/buckets`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Origin': this.baseUrl,
                'Content-Type': 'application/json'
            },
            'credentials': 'include'
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403 || response.status === 500) {
                throw new UnauthorizedException();
            }
            throw new Error('Request failed');
        }
        return response;
    }
}
