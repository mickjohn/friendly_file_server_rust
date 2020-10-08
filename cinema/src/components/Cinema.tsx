// Component Imports
import React, {Fragment } from 'react';
import VideoPlayer from './VideoPlayer';

// Other classes
import Config from '../config';
import {parseMessage, Play, Pause, Stats, Disconnected, StatsResponses, RequestStats, PlayerState, Seeked} from '../messages';
import User, { findDirector } from '../user';
import WebsocketWrapper from '../websocket';

import './Cinema.css';
import SideContent from './SideContent';
import { removeRoomFromUrl } from '../utils';


interface State {
    // Video player state
    isPlaying: boolean;
    currentTime: number;

    // This is a hacky prop used to inform the VideoPlayer that it's to apply
    // the current time from the Props.
    adjustTime: number;

    // Party state
    inParty: boolean;
    // isDirector: boolean;
    // roomCode: string|undefined;
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
    startingTime?: number;
};

class Cinema extends React.Component<Props, State> {

    websocket: WebsocketWrapper|undefined;
    catchUpOnJoin: boolean;

    constructor(props: Props) {
        super(props);
        this.websocket = undefined;
        this.catchUpOnJoin = true;


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

    // The websocket message handler.
    wsMessageReceived(e: MessageEvent) {
        console.log("Received Websocket Message " + e.data);
        const message = parseMessage(JSON.parse(e.data));
        switch(message.type) {
            case Play.type: {
                this.setState({isPlaying: true});
                break;
            }
            case Pause.type: {
                this.setState({isPlaying: false});
                break;
            }
            case StatsResponses.type: {
                const statsResonses = message as StatsResponses;
                const users = statsResonses.responses.map((r) => { return r.toUser()});
                if (this.catchUpOnJoin) {
 
                }

                this.setState({
                    connectedUsers: users,
                    directorName: statsResonses.director ?? undefined
                });
                break;
            }
            case Disconnected.type: {
                const disconnected = message as Disconnected;
                const users = [...this.state.connectedUsers];
                // Find user to delete by it's ID
                let indexToDelete = undefined;
                users.forEach((user, index) => {
                    if (user.id === disconnected.id)  indexToDelete = index;
                });
                if (indexToDelete) delete users[indexToDelete];
                this.setState({connectedUsers: users});
                break;
            }
            case Seeked.type: {
                console.log("Received Seeked message");
                const seeked = message as Seeked;
                // Only seek if not a director
                const adjustTime = this.state.adjustTime;
                if (!this.props.isDirector) {
                    this.setState({
                        adjustTime: adjustTime+1,
                        currentTime: seeked.time,
                    });
                }
                break;
            }
            default: {
                console.log(`No action taken for message ${e.data}`);
                break; 
            }
        }
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

    // A to call when the room has just been created.
    onRoomCreated(roomCode: string) {
        window.localStorage.setItem(Config.localStorageKeys.roomCode, roomCode);
        this.joinRoom(roomCode, true);
    };

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

    /*
    Create the VideoPlayer component and configure it according to if and how the user
    is connected to the party.
    */
    getVideoPlayer() {
        let onPlay, onPause, onSeek, onTimeInterval;

        // In a party and the director
        if (this.state.inParty && this.props.isDirector) {
            onPlay = () => {
                console.log("Playing...");
                const msg: Play = new Play(this.state.name);
                this.websocket?.send(msg);
            };

            onPause = () => {
                console.log("Pausing...")
                const msg: Pause = new Pause(this.state.name);
                this.websocket?.send(msg);
            };

            onTimeInterval = (time: number, playerState: PlayerState) => {
                // On the interval, send this userse stats, and request an update on the users.
                this.websocket?.send(new Stats(this.state.name, time, playerState, this.props.isDirector));
                this.websocket?.send(new RequestStats());
            };

            onSeek = (time: number) => {
                this.setState({
                    currentTime: time,
                    adjustTime: this.state.adjustTime + 1,
                });
                this.websocket?.send(new Seeked(this.state.name, time));
            };

        // Else, when in a party but as a guest
        } else if (this.state.inParty) {
            onTimeInterval = (time: number, playerState: PlayerState) => {
                // On the interval, send this userse stats, and request an update on the users.
                this.websocket?.send(new Stats(this.state.name, time, playerState, this.props.isDirector));
                this.websocket?.send(new RequestStats());
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
        if (!this.state.showSideWindow) return null;
        return (
            <SideContent 
                roomCreatedCallback={(roomCode) => this.onRoomCreated(roomCode)}
                leaveButtonCallback={() => this.leaveParty()}
                hideCallback={() => this.setState({showSideWindow: false})}
                setUserNameCallback={(name) => {
                    this.setState({name: name});
                    window.localStorage.setItem(Config.localStorageKeys.userName, name);
                }}
                pauseCallback={() => this.setState({isPlaying: false})}

                connectedUsers={this.state.connectedUsers}
                name={this.state.name}
                inParty={this.state.inParty}
                room={this.props.roomCode}
                directorName={this.state.directorName}
                isDirector={this.props.isDirector}
            />
        );
    }

    componentDidMount() {
        if (this.props.roomCode) {
            this.joinRoom(this.props.roomCode, this.props.isDirector);
        }
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
