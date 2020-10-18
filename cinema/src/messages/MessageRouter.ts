import DisconnectedMessage from "./DisconnectedMessage";
import Message from "./Message";
import PauseMessage from "./PauseMessage";
import PlayMessage from "./PlayMessage";
import SeekedMessage from "./SeekedMessage";
import StatsResponseMessage from "./StatsResponseMessage";
import StatsResponsesMessage from "./StatsResponsesMessage";

class MessageRouter {
    private fnMap: Map<string, (a: any) => void>;

    private static messageTypes = [
        PlayMessage,
        PauseMessage,
        SeekedMessage,
        DisconnectedMessage,
        StatsResponsesMessage,
    ];

    constructor() {
        this.fnMap = new Map();
    }

    deserialiseMessage(msg: string): Message | null {
        const json = JSON.parse(msg);
        if (!json) {
            console.error("Error parsing json. Json data = " + msg);
            return null;
        }

        for (const m of MessageRouter.messageTypes) {
            const val = m.fromJson(json);
            if (val !== null) return val;
        }
        console.error("Could not parse msg. json = " + msg);
        return null;
    }

    routeMessage(msg: string): void {
        // Parse the message into a Message class
        const deserialised = this.deserialiseMessage(msg);
        if (!deserialised) return;

        // Find the function to call for this Message type and call it
        const fn = this.fnMap.get(deserialised.type);
        if (fn) {
            fn(deserialised);
            return;
        }
        console.error("Message not handled. Message data = " + msg);
    }

    onPlayMessage(f: (_p: PlayMessage) => void) { this.fnMap.set(PlayMessage.type, f); }
    onPauseMessage(f: (_p: PauseMessage) => void) { this.fnMap.set(PauseMessage.type, f); }
    onSeekedMessage(f: (_p: SeekedMessage) => void) { this.fnMap.set(SeekedMessage.type, f); }
    onDisconnectedMessage(f: (_p: DisconnectedMessage) => void) { this.fnMap.set(DisconnectedMessage.type, f); }
    onStatsResponsesMessage(f: (_p: StatsResponsesMessage) => void) {this.fnMap.set(StatsResponseMessage.type, f);}
}

export default MessageRouter;