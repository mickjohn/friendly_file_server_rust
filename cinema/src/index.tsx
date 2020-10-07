// Component Imports
import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import Cinema from './components/Cinema';
import Spinner from './components/Spinner';

import Config from './config';
import {removeRoomFromUrl} from './utils';


// CSS imports
import './index.css';

interface Props {};

interface State {
    // The URL of the MP4 to be played
    videoSource: string | undefined;

    // The roomCode. This is taken from the URL params
    // The roomCode can also be updated by a child component. This will happen
    // when a user creates a new room.
    roomCode: string | undefined;
    
    // This person is the director if certain data in localStorage is set
    isDirector: boolean;

    // The rest of the values are initialisation stuff
    initialising: boolean;
    loadingMessage: string;
    errorMessage: string | undefined;
};


class App extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        const params = new URLSearchParams(window.location.search);
        const storageCode = window.localStorage.getItem(Config.localStorageKeys.roomCode);
        const roomCode = params.get(Config.urlParamKeys.roomCode) ?? undefined;

        // User is the director is both the storageCode and roomCode are
        // defined, and are equal to each other
        const isDirector = (
            (storageCode !== null)
            && (roomCode !== undefined)
            && storageCode === roomCode
        );

        // If not a director, clean up any existing room codes.
        if (!isDirector) window.localStorage.removeItem(Config.localStorageKeys.roomCode);

        this.state = {
            videoSource: params.get('video') ?? undefined,
            roomCode: roomCode,
            initialising: true,
            loadingMessage: "Initialising...",
            errorMessage: undefined,
            isDirector: isDirector,
        }
    }

    componentDidMount() {
        // If the video source is not set, set the error message and return early.
        if (!this.state.videoSource) {
            const msg = "Cannot play video";
            this.setState({errorMessage: msg, initialising: false});
            return;
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

    isError() {
        return this.state.errorMessage !== undefined || this.state.initialising;
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

    getVideoElem() {
        if(!this.state.videoSource || this.isError()) return null;
        return <Cinema
            videoSource={this.state.videoSource}
            setIsDirectorCallback={(isDirector) => {this.setState({isDirector: isDirector})}}
            isDirector={this.state.isDirector}
            roomCode={this.state.roomCode}
        />
    }

    getSpinner() {
        if (!this.state.initialising) return null;
        return <Spinner message={this.state.loadingMessage} />
    }

    render() {
        return (
            <Fragment>
                <header>
                    <h2>Mickjohn.com</h2>
                </header>
                {this.getVideoElem()}
                {this.getSpinner()}
                {this.getErrorElem()}
            </Fragment>
        );
    }
}

ReactDOM.render(<App />, document.querySelector('#root'));
