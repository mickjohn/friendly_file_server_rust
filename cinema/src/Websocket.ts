import Message from './messages';

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
        if (onMessage) {
            console.log("Adding on message handler");
            this.ws.addEventListener('message', (e) => onMessage(e));
        }
        if (onOpen) this.ws.addEventListener('open', onOpen);
    }

    send(msg: Message) {
        const stringData = msg.toJson();
        this.ws.send(stringData);
    }

}

export default WebsocketWrapper;