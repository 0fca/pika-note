import MlService from "@/services/mlService";
import UnauthorizedException from "../components/exceptions/UnauthorizedException";

export default class NoteService {
    constructor() {
        this.baseUrl = "https://localhost:8001";
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

        throw new UnauthorizedException();
    }

    async getNote(id) {
        const url = `/notes/${id}`;
        const rawJson = await this.readData(url);
        return rawJson.payload;
    }

    async saveNote(id, name, content, rawContent) {
        const url = `${this.baseUrl}/notes/${id}`;
        if (process.env === 'PROD') {
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
        if (process.env === 'PROD') {
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
        return await fetch(url, {
            method: 'GET',
            headers: {
                'Origin': this.baseUrl,
                'Content-Type': 'application/json'
            },
            'credentials': 'include'
        })
    }
}