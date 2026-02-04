export default class Input{
    constructor(text) {
        this.text = text;
    }

    static from(json){
        return Object.assign(new Input(), json)
    }
}