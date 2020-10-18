abstract class Message {
    static type: string;
    abstract type: string;
    abstract toJson(): string;

    static fromJson(json: any): Message | null {
        return null;
    }
}

export default Message;