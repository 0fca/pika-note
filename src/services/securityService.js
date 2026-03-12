export default class SecurityService {
    constructor() {
        this.baseUrl = process.env.VUE_APP_API_BASE_URL || "https://noteapi.lukas-bownik.net";
    }

    async validateLoggedInState() {
        const response = await fetch(`${this.baseUrl}/Security/Check`, {
            method: 'GET',
            headers: {
                'Origin': this.baseUrl,
            },
            credentials: 'include'
        });
        return response.ok;
    }
}


