import Message from "./Message";

export default class DisconnectedMessage extends Message {
    static type = 'Play';
    type: string;
    id: number;

    constructor(id: number) {
        super();
        this.type = DisconnectedMessage.type;
        this.id = id;
    }

    toJson(): string {
        return `{
            "type": "${this.type}",
            "id": ${this.id}
        }`;
    }

    fromJson(msg: any) : DisconnectedMessage | null {
        if (msg.type !== this.type) return null;
        return new DisconnectedMessage(msg['id']);
    }
}