// Component Imports
import React, {Fragment } from 'react';
import VideoPlayer from './VideoPlayer';

// Other classes
import Config from '../config';
// import {parseMessage, Play, Pause, Stats, Disconnected, StatsResponses, RequestStats, PlayerState, Seeked} from '../messages';
import User, { findDirector } from '../user';
import WebsocketWrapper from '../websocket-wrapper';

import './Cinema.css';
import SideContent from './SideContent';
import { removeRoomFromUrl } from '../utils';
import PlayMessage from '../messages/PlayMessage';
import PauseMessage from '../messages/PauseMessage';
import SeekedMessage from '../messages/SeekedMessage';
import MessageRouter from '../messages/MessageRouter';
import StatsResponsesMessage from '../messages/StatsResponsesMessage';
import PlayerState from '../playerstate';
import StatsMessage from '../messages/StatsMessage';
import RequestStatsMessage from '../messages/RequestStatsMessage';


interface State {
    // Video player state
    isPlaying: boolean;
    currentTime: number;

    // This is a hacky prop used to inform the VideoPlayer that it's to apply
    // the current time from the Props.
    adjustTime: number;

    // Party state
    inParty: boolean;
    name: string;
    connectedUsers: User[];
    directorName: string|undefined;

    // Other state
    showSideWindow: boolean;
}

interface Props {
    videoSource: string;
    roomCode?: string;
    isDirector: boolean;
    setIsDirectorCallback: (isDirector: boolean) => void;
    setRoomCodeCallback: (roomCode: string) => void;
    startingTime?: number;
};

class Cinema extends React.Component<Props, State> {

    websocket: WebsocketWrapper|undefined;
    catchUpOnJoin: boolean;
    messageRouter: MessageRouter;

    constructor(props: Props) {
        super(props);
        this.websocket = undefined;
        this.catchUpOnJoin = true;

        this.messageRouter = new MessageRouter();
        this.messageRouter.onPlayMessage((p: PauseMessage) => this.onPlayMessage(p));
        this.messageRouter.onPauseMessage((p: PlayMessage) => this.onPauseMessage(p));
        this.messageRouter.onStatsResponsesMessage((p: StatsResponsesMessage) => this.onStatsResponsesMessage(p));
        this.messageRouter.onSeekedMessage((m: SeekedMessage) => this.onSeekedMessage(m));


        this.state = {
            isPlaying: false,
            currentTime: props.startingTime ?? 0,
            inParty: false,
            name: window.localStorage.getItem(Config.localStorageKeys.userName) ?? "user",
            connectedUsers: [],
            directorName: undefined,
            showSideWindow: true,
            adjustTime: 0,
        }
    }

    createWebsocket(roomCode: string) { 
        const websocketUrl = `${Config.wsUrl}/${roomCode}`;
        console.log(`websocket URL = ${websocketUrl}`);
        return new WebsocketWrapper(
            websocketUrl,
            (e: CloseEvent) => { },
            (e: Event | ErrorEvent) => { },
            (e: MessageEvent) => this.wsMessageReceived(e),
            (e: Event) => { },
        );
    }

    onPlayMessage(msg: PlayMessage) {
        this.setState({isPlaying: true});
    }

    onPauseMessage(msg: PauseMessage) {
        this.setState({isPlaying: false});
    }

    onStatsResponsesMessage(msg: StatsResponsesMessage) {
        const users = msg.responses.map((r) => { return r.toUser() });
        if (this.catchUpOnJoin) {
            this.catchUpWithDirector(users);
        }

        this.setState({
            connectedUsers: users,
            directorName: msg.director ?? undefined
        });
    }

    onSeekedMessage(msg: SeekedMessage) {
        console.debug("On Seeked.");
        // Don't forget that an update to adjustTime just informs the
        // VideoPlayer component to set it's time to the props time
        const adjustTime = this.state.adjustTime;

        // Only seek if not a director
        if (!this.props.isDirector) {
            this.setState({
                adjustTime: adjustTime + 1,
                currentTime: msg.time,
            });
        }
    }

    // The websocket message handler.
    wsMessageReceived(e: MessageEvent) {
        const msg = e.data;
        this.messageRouter.routeMessage(msg);
    };

    catchUpWithDirector(users: User[]) {
        const director = findDirector(users);
        if (director) {
            console.log("Catching up with the director...");
            const playing = director.state === PlayerState.Playing;
            this.setState({
                currentTime: director.time + 1,
                adjustTime: this.state.adjustTime + 1,
                isPlaying: playing,
            });
            this.catchUpOnJoin = false;
        }
    }

    // Join a room and specify if director or not.
    joinRoom(roomCode: string, director: boolean) {
        const newUrl = `${window.location.origin}${window.location.pathname}?video=${this.props.videoSource}&room=${roomCode}`;
        window.history.replaceState('', '', newUrl);
        this.websocket = this.createWebsocket(roomCode);
        this.setState({inParty: true});
        this.props.setIsDirectorCallback(director);
    }

    // Close the websocket and unset all party related state.
    leaveParty() {
        this.setState({
            inParty: false,
            isPlaying: false,
            connectedUsers: [],
        });
        this.websocket?.close();
        this.props.setIsDirectorCallback(false);
        removeRoomFromUrl();
    }

    // Create the VideoPlayer component and configure it according to if and how the user
    // is connected to the party.
    getVideoPlayer() {
        let onPlay, onPause, onSeek, onTimeInterval;

        // In a party and the director
        if (this.state.inParty && this.props.isDirector) {
            onPlay = () => {
                this.websocket?.send(new PlayMessage(this.state.name));
            };

            onPause = () => {
                this.websocket?.send(new PauseMessage(this.state.name));
            };

            onTimeInterval = (time: number, playerState: PlayerState) => {
                // On the interval, send this userse stats, and request an update on the users.
                this.websocket?.send(new StatsMessage(this.state.name, time, playerState, this.props.isDirector));
                this.websocket?.send(new RequestStatsMessage());
            };

            onSeek = (time: number) => {
                this.setState({
                    currentTime: time,
                    adjustTime: this.state.adjustTime + 1,
                });
                // Pause on Seek. This is to allow the director to wait for people to catch up.
                this.websocket?.send(new PauseMessage(this.state.name));
                this.websocket?.send(new SeekedMessage(this.state.name, time));
            };

        // Else, when in a party but as a guest
        } else if (this.state.inParty) {
            onTimeInterval = (time: number, playerState: PlayerState) => {
                // On the interval, send this userse stats, and request an update on the users.
                this.websocket?.send(new StatsMessage(this.state.name, time, playerState, this.props.isDirector));
                this.websocket?.send(new RequestStatsMessage());
            };

            // Guests can't play, pause or seek, so make them no-ops
            onPlay = () => {};
            onPause = () => {};
            onSeek = () => {};
        } else {
            // Otherwise, standard video controls.
            onPlay = () => this.setState({isPlaying: true});
            onPause = () => this.setState({isPlaying: false});
        }

        return <VideoPlayer
            playing={this.state.isPlaying}
            source={this.props.videoSource}
            showPartyButton={!this.state.showSideWindow}
            partyButtonOnClick={() => this.setState({showSideWindow: true})}
            onPlay={onPlay}
            onPause={onPause}
            onSeek={onSeek}
            adjustTime={this.state.adjustTime}
            onTimeInterval={onTimeInterval}
            currentTime={this.state.currentTime}
            setCurrentTimeCallback={(t: number)=> this.setState({currentTime: t})}
        />
    }

    getSideWindow() {
        // if (!this.state.showSideWindow) return null;
        return (
            <SideContent 
                roomCreatedCallback={(roomCode) => {
                    this.props.setRoomCodeCallback(roomCode);
                    this.props.setIsDirectorCallback(true);
                }}
                leaveButtonCallback={() => this.leaveParty()}
                hideCallback={() => this.setState({showSideWindow: false})}
                setUserNameCallback={(name) => {
                    this.setState({name: name});
                    window.localStorage.setItem(Config.localStorageKeys.userName, name);
                }}
                pauseCallback={() => this.setState({isPlaying: false})}

                showSideWindow={this.state.showSideWindow}
                connectedUsers={this.state.connectedUsers}
                name={this.state.name}
                inParty={this.state.inParty}
                room={this.props.roomCode}
                directorName={this.state.directorName}
                isDirector={this.props.isDirector}
            />
        );
    }

    componentDidUpdate(prevProps: Props) {
        if (this.props.roomCode && this.props.roomCode !== prevProps.roomCode) {
            this.joinRoom(this.props.roomCode, this.props.isDirector);
        }

    }

    componentDidMount() {
        if (this.props.roomCode) {
            this.joinRoom(this.props.roomCode, this.props.isDirector);
        }
    }

    componentWillUnmount() {
        this.websocket?.close();
    }

    render() {
        return (
            <Fragment>
                <div className="cinema-container">
                    {this.getVideoPlayer()}
                    {this.getSideWindow()}
                </div>
            </Fragment>
        );
    }
}


export default Cinema;
