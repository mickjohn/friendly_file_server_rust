import { stringify } from "querystring";
import Message from "./Message";

export default class PlayMessage extends Message {
    static type = 'Play';
    type: string;
    name: string;

    constructor(name: string) {
        super();
        this.type = PlayMessage.type;
        this.name = name;
    }

    toJson(): string {
        return `{
            "type": "${this.type}",
            "name": "${this.name}"
        }`;
    }

    fromJson(msg: any) : PlayMessage | null {
        if (msg.type !== this.type) return null;
        return new PlayMessage(msg['name']);
    }
}