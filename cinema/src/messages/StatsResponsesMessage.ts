import Message from "./Message";
import StatsResponseMessage from "./StatsResponseMessage";

export default class StatsResponsesMessage extends Message {
    static type = 'StatsResponses';
    type: string;
    responses: StatsResponseMessage[];
    director: string|null;

    constructor(
        responses: StatsResponseMessage[],
        director: string|null,
    ) {
        super();
        this.type = StatsResponseMessage.type;
        this.responses = responses;
        this.director = director;
    }

    toJson(): string {
        const d = this.director === null ? null : `"${this.director}"`;
        const responses_json: string[] = this.responses.map(r => {
            return `{"name": "${r.name}", "id": ${r.id}, "time": ${r.time}, "playerState": "${r.playerState}", "director": ${r.director}}`;
        });
        const responses = `[${responses_json.join(',')}]`;
        return `{
            "type": "${this.type}",
            "director": ${d},
            "responses": ${responses}
        }`;
    }

    static fromJson(msg: any): StatsResponsesMessage | null {
        if (msg.type !== this.type) return null;
        const responses = msg['responses'].map((r: any) => {
            return new StatsResponseMessage(
                r['name'],
                r['time'],
                r['id'],
                r['player_state'],
                r['director'],
            )
        });
        const director: string | null = msg['director'];
        return new StatsResponsesMessage(responses, director);
    }
}