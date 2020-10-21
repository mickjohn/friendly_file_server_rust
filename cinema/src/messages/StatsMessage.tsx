import PlayerState from "../playerstate";
import Message from "./Message";

export default class StatsMessage extends Message {
    static type = "Stats";
    type = StatsMessage.type;
    name: string;
    time: number;
    playerState: PlayerState;
    director: boolean;

    constructor(
        name: string,
        time: number,
        playerState: PlayerState,
        director: boolean,
    ) {
        super();
        this.name = name;
        this.time = time;
        this.playerState = playerState;
        this.director = director;
    }

    toJson() {
        return `{
            "type": "${this.type}",
            "name": "${this.name}",
            "time": ${this.time},
            "player_state": "${this.playerState}",
            "director": ${this.director}
        }`;
    }

    static fromJson(): StatsMessage | null {
        return null;
    }

}