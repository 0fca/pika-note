export default class Prediction{

    static from(json){
        return Object.assign(new Prediction(), json);
    }
}