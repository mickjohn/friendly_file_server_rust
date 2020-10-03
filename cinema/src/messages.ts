import User from './user';

type Message = Play
    | Pause
    | Seeked
    | Disconnected
    | StatsResponse
    | Unknown;

export enum PlayerState {
    Playing = "Playing",
    Paused = "Paused",
    Loading = "Loading",
}

export class Play {
    static type: string = "Play"
    name: string;
    type = Play.type;

    constructor(name: string) { this.name = name; }

    toJson() {
        return `{"type": "${Play.type}", "name": "${this.name}"}`;
    }
}

export class Pause {
    static type = "Pause";
    name: string;
    type = Pause.type;

    constructor(name: string) { this.name = name; }

    toJson() {
        return `{"type": "${Pause.type}", "name": "${this.name}"}`;
    }
}

export class Seeked {
    static type =  "Seeked";
    type = Seeked.type;
    time: number;
    constructor(time: number) { this.time = time }

    toJson() {
        return `{"type": "${Seeked.type}", "time": ${this.time}}`;
    }
}

export class Disconnected {
    static type = "Disconnected";
    type = Disconnected.type;
    id: number;
    constructor(id: number) {this.id = id}

    toJson() {
        return `{"type": "${Disconnected.type}", "id": ${this.id}}`;
    }
}

export class StatsResponse {
    static type = "StatsResponse";
    type = StatsResponse.type;
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
        this.name = name;
        this.time = time;
        this.id = id;
        this.playerState = playerState;
        this.director = director;
    }

    toJson() {
        return `{
            "type": "${StatsResponse.type}",
            "name": "${this.name}",
            "time": ${this.time},
            "id": ${this.id},
            "playerState": "${this.playerState}",
            "director": ${this.director}
        }`;
    }

    toUser() {
        return new User(
            this.id,
            this.name,
            this.playerState,
            this.time,
            this.director,
        );
    }

}

export class StatsResponses {
    static type = "StatsResponses";
    type = StatsResponses.type;
    responses: StatsResponse[];
    director: string | null;

    constructor(responses: StatsResponse[], director: string|null) {
        this.responses = responses;
        this.director = director;
    }

    toJson() {
        const responses_json: string[] = this.responses.map(r => {
            return `{"name": "${r.name}", "id": ${r.id}, "time": ${r.time}, "playerState": "${r.playerState}", "director": ${r.director}}`;
        });
        const responses = `[${responses_json.join(',')}]`;

        return `{
            "type": "${StatsResponses.type},
            "director": "${this.director}",
            "responses": ${responses},
        }`;
    }
}

export class Stats {
    static type = "Stats";
    type = Stats.type;
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
        this.name = name;
        this.time = time;
        this.playerState = playerState;
        this.director = director;
    }

    toJson() {
        return `{
            "type": "${Stats.type}",
            "name": "${this.name}",
            "time": ${this.time},
            "player_state": "${this.playerState}",
            "director": ${this.director}
        }`;
    }

}


export class RequestStats {
    static type = "RequestStats";
    type = RequestStats.type;

    toJson() {
        return `{"type": "${this.type}"}`;
    }
}



class Unknown {
    static type = "Unkown";
    type = Unknown.type;

    toJson() {
        return `{"type": "${Unknown.type}"}`;
    }
};

export function parseMessage(msg: any) : Message {
    const type: string | undefined = msg['type'];
    if (type === undefined) return new Unknown();

    if (type === Play.type) return new Play(msg.name);
    if (type === Pause.type) return new Pause(msg.name);
    if (type === Seeked.type) return new Seeked(msg['time']);
    if (type === Disconnected.type) return new Disconnected(msg['id']);
    if (type === StatsResponse.type) {
        return new StatsResponse(
            msg['name'],
            msg['time'],
            msg['id'],
            msg['player_state'],
            msg['director'],
        );
    }

    if (type === StatsResponses.type) {
        const responses = msg['responses'].map((r: any) => {
            return new StatsResponse(
                r['name'],
                r['time'],
                r['id'],
                r['player_state'],
                r['director'],
            )
        });
        const director: string|null = msg['director'];
        return new StatsResponses(responses, director);
    }
    return new Unknown();
}

export default Message;