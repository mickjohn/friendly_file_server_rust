import Message from "./Message";

export default class PauseMessage extends Message {
    static type = 'Play';
    type: string;
    name: string;

    constructor(name: string) {
        super();
        this.type = PauseMessage.type;
        this.name = name;
    }

    toJson(): string {
        return `{
            "type": "${this.type}",
            "name": "${this.name}"
        }`;
    }

    fromJson(msg: any) : PauseMessage | null {
        if (msg.type !== this.type) return null;
        return new PauseMessage(msg['name']);
    }
}