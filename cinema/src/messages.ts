type Message = Play
    | Pause
    | Seeked
    | Disconnected
    | StatsResponse
    | Unknown;

class Play {
    static control = "Play"
}

class Pause {
    static control = "Pause";
}

class Seeked {
    static control =  "Seeked";
    time: number;
    constructor(time: number) { this.time = time }
}

class Disconnected {
    static control = "Disconnected";
    id: number;
    constructor(id: number) {this.id = id}
}

class StatsResponse {
    static control = "StatsResponse";
    name: string;
    time: number;
    id: number;
    playerState: string;

    constructor(
        name: string,
        time: number,
        id: number,
        playerState: string,
    ) {
        this.name = name;
        this.time = time;
        this.id = id;
        this.playerState = playerState;
    }

}

class Unknown {};

function parseMessage(msg: any) : Message {
    const control: string | undefined = msg['control'];

    if (control === Play.control) return new Play();
    if (control === Pause.control) return new Pause();
    if (control === Seeked.control) return new Seeked(msg['time']);
    if (control === Disconnected.control) return new Disconnected(msg['id']);
    if (control === StatsResponse.control) {
        return new StatsResponse(
            msg['name'],
            msg['time'],
            msg['id'],
            msg['player_state'],
        );
    }

    return new Unknown();
}

export default Message;