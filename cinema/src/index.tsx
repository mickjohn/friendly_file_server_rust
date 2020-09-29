// Component Imports
import React from 'react';
import ReactDOM from 'react-dom';
import Cinema from './components/Cinema';
import Spinner from './components/Spinner';

import Config from './config';
import {removeRoomFromUrl} from './utils';


// CSS imports
import './index.css';

interface Props {};

interface State {
    videoSource: string | undefined;
    roomCode: string | undefined;
    storageCode: string | undefined;
    initialising: boolean;
    loadingMessage: string;
    errorMessage: string | undefined;
};


class App extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        const params = new URLSearchParams(window.location.search);
        this.state = {
            videoSource: params.get('video') ?? undefined,
            roomCode: params.get('room') ?? undefined,
            storageCode: window.localStorage.getItem(Config.localStorageKeys.roomCode) ?? undefined,
            initialising: true,
            loadingMessage: "Initialising...",
            errorMessage: undefined,
        }
    }

    componentDidMount() {
        // If storage code does not match param code, remove it.
        if (this.state.storageCode && this.state.roomCode !== this.state.storageCode) {
            window.localStorage.removeItem(Config.localStorageKeys.roomCode);
        }

        // Validate that the room code exists
        if (this.state.roomCode) {
            this.setState({ loadingMessage: "Checking room code..." });
            const controller = new AbortController();
            const signal = controller.signal;
            const url = `/${Config.checkRoomEndpoint}?room=${this.state.roomCode}`;
            const fetchPromise = fetch(url, { signal });
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.log("Request to check room timed out");
                removeRoomFromUrl();
                this.setState({ errorMessage: "Something went wrong" });
            }, 3000);

            fetchPromise
                .then(response => response.json())
                .then((data) => {
                    clearTimeout(timeoutId);
                    if (data && data['exists']) {
                        console.log("Room exists");
                        this.setState({ initialising: false });
                    } else {
                        console.log("Room does not exists");
                        removeRoomFromUrl();
                        this.setState({ errorMessage: "Room does not exist :(" });
                    }
                })
                .catch((_e) => {});
        } else {
            this.setState({initialising: false});
        }
    }

    render() {
        if (this.state.initialising) {
            return <Spinner display={this.state.initialising} message={this.state.loadingMessage} />;
        } else if (this.state.videoSource) {
            return <Cinema videoSource={this.state.videoSource} />;
        } else {
            return <p>No source</p>
        }
    }
}

ReactDOM.render(<App />, document.querySelector('#root'));
