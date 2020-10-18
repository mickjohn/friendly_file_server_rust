import { HighlightSpanKind } from "typescript";
import Message from "./Message";

export default class StatsResponseMessage extends Message {
    static type = 'StatsResponse';
    type: string;
    name: string;
    time: number;
    id: number;
    playerState: string;
    director: boolean;

    constructor(
        name: string,
        time: number,
        id: number,
        playerState: string,
        director: boolean,
    ) {
        super();
        this.type = StatsResponseMessage.type;
        this.name = name;
        this.time = time;
        this.id = id;
        this.playerState = playerState;
        this.director = director;
    }

    toJson(): string {
        return `{
            "type": "${this.type}",
            "name": "${this.name}",
            "time": ${this.time},
            "id": ${this.id},
            "playerState": "${this.playerState}",
            "director": ${this.director}
        }`;
    }

    fromJson(msg: any) : StatsResponseMessage | null {
        if (msg.type !== this.type) return null;
        return new StatsResponseMessage(
            msg['name'],
            msg['time'],
            msg['id'],
            msg['playerState'],
            msg['directr']
        );
    }
}