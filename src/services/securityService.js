export default class SecurityService {
    constructor() {
        this.baseUrl = process.env.VUE_APP_API_BASE_URL || "https://noteapi.lukas-bownik.net";
    }

    async validateLoggedInState() {
        const url = `${this.baseUrl}/Security/Check`;
        const options = {
            method: 'GET',
            headers: {
                'Origin': this.baseUrl,
            },
            credentials: 'include'
        };

        const response = await fetch(url, options);

        if (response.status === 401) {
            const retryResponse = await fetch(url, options);
            return retryResponse.ok;
        }

        return response.ok;
    }
}


