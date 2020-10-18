import Message from "./Message";

export default class SeekedMessage extends Message {
    static type = 'Play';
    type: string;
    name: string;
    time: number;

    constructor(name: string, time: number) {
        super();
        this.type = SeekedMessage.type;
        this.name = name;
        this.time = time;
    }

    toJson(): string {
        return `{
            "type": "${this.type}",
            "name": "${this.name}",
            "time: ${this.time}
        }`;
    }

    fromJson(msg: any) : SeekedMessage | null {
        if (msg.type !== this.type) return null;
        return new SeekedMessage(msg['name'], msg['time']);
    }
}