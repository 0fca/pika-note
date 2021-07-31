import MlService from "@/services/mlService";

export default class NoteService {
    constructor() {
        this.baseUrl = "https://pikanoteapi.azurewebsites.net";
    }

    async readData(url = '') {
        url = this.baseUrl + url;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Origin': this.baseUrl
            }
        });
        return response.json();
    }

    async saveNote(id, name, content, rawContent) {
        const url = `${this.baseUrl}/notes/${id}`;
        const mlService = new MlService();
        const p = await mlService.validateLanguage(name, rawContent)
        if (p.prediction === false) {
            throw new Error('Mind your language!')
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
            })
        });
    }

    async addNote(name, content) {
        const url = `${this.baseUrl}/notes`;
        return await fetch(url, {
            method: 'POST',
            headers: {
                'Origin': this.baseUrl,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "name": name,
                "content": content
            })
        });
    }
}