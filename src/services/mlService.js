import Input from "@/models/input";
import Prediction from "@/models/prediction";

export default class MlService {
    constructor() {
        this.baseMlModuleUrl = process.env.VUE_APP_ML_BASE_URL || 'https://ml.lukas-bownik.net';
    }

    async validateLanguage(name, content) {
        const mlModuleEndpoint = `${this.baseMlModuleUrl}/api/hs/predict`;
        return await fetch(mlModuleEndpoint, {
                method: 'POST',
                headers: {
                    'Origin': this.baseMlModuleUrl,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(new Input(`${name} ${content}`))
            })
            .then(b => {
                return b.json().then(b => {
                    return Prediction.from(b);
                }).catch(e => {
                    console.log(e)
                });
            })
            .catch(e => {
                throw new Error(e)
            })
    }
}