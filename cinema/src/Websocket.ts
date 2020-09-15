import { on } from "process";

enum WebsocketState {
    Connecting,
    Open,
    Closing,
    Closed,
    NotStarted,
}

class WebsocketWrapper {
    state: WebsocketState;
    url: string;
    ws: WebSocket;

    constructor(
        url: string,
        onClose?: (e: CloseEvent) => void,
        onError?: (e: Event|ErrorEvent) => void,
        onMessage?: (e: MessageEvent) => void,
        onOpen?: (e: Event) => void,
    ) {
        this.url = url;
        this.ws = new WebSocket(url);
        this.state = WebsocketState.NotStarted;

        if (onClose) this.ws.addEventListener('close', onClose);
        if (onError) this.ws.addEventListener('error', onError);
        if (onMessage) this.ws.addEventListener('message', onMessage);
        if (onOpen) this.ws.addEventListener('open', onOpen);


    }

}

export default WebsocketWrapper;