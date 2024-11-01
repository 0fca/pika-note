export default class SecurityService {
    constructor() {
        this.baseUrl = "https://pikanoteapi.azurewebsites.net";
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


