import Message from "./Message";

export default class RequestStatsMessage extends Message {
    static type = 'RequestStats';
    type = RequestStatsMessage.type;

    toJson(): string {
        return `{"type": "${this.type}"}`;
    }

    // This message isn't received
    static fromJson(msg: any) : RequestStatsMessage | null {
        return null
    }
}