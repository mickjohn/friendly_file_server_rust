// Component Imports
import React, { Component, Fragment } from 'react';
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
        // If the video source is not set, set the error message and return early.
        if (!this.state.videoSource) {
            const msg = "Cannot play video";
            this.setState({errorMessage: msg, initialising: false});
            return;
        }

        // If storage code does not match param code, remove it.
        if (this.state.storageCode && this.state.roomCode !== this.state.storageCode) {
            window.localStorage.removeItem(Config.localStorageKeys.roomCode);
        }

        // Add a minimum time to show spinner for. This is so that the spinner doesn't just flash up on the screen
        // for a split second.
        setTimeout(() => {
            // If a room code was provided in the URL, validate the room code.
            // validation can be done with the room validation endpoint of the webserver.
            // If the room is invalid, or the request times out then display an error.
            if (this.state.roomCode) {
                this.setState({ loadingMessage: "Checking room code...", initialising: true });
                const controller = new AbortController();
                const signal = controller.signal;
                const url = `/${Config.checkRoomEndpoint}?room=${this.state.roomCode}`;
                const fetchPromise = fetch(url, { signal });
                const timeoutId = setTimeout(() => {
                    controller.abort();
                    console.log("Request to check room timed out");
                    removeRoomFromUrl();
                    this.setState({ errorMessage: "Could not connect to websocket server", initialising: false });
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
                            const msg = `Cannot find room '${this.state.roomCode}'`;
                            this.setState({ errorMessage: msg, initialising: false });
                        }
                    })
                    .catch((_e) => { });
            } else {
                this.setState({ initialising: false });
            }
        }, 600);
    }

    getErrorElem() {
        if (!this.state.errorMessage) return null;
        return (
            <div className="error-message">
                <h2> Something Went Wrong :( </h2>
                <p>{this.state.errorMessage}</p>
                <a href={Config.redirect_target}><h3>Back to browse</h3></a>
            </div>
        );
    }

    render() {
        const isError = this.state.errorMessage !== undefined || this.state.initialising;
        const video = this.state.videoSource && !isError ? <Cinema videoSource={this.state.videoSource} /> : null;
        const spinner = this.state.initialising ? <Spinner message={this.state.loadingMessage} /> : null;

        return (
            <Fragment>
                <header>
                    <h2> Mickjohn.com</h2>
                </header>
                {video}
                {spinner}
                {this.getErrorElem()}
            </Fragment>
        );
    }
}

ReactDOM.render(<App />, document.querySelector('#root'));
