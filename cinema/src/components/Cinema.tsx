// Component Imports
import React, {Fragment } from 'react';
import VideoPlayer from './VideoPlayer';
import ModalPopup from './ModalPopup';
import CreateRoom from './CreateRoom';
import UsersTable from './UsersTable'

// Other classes
import Config from '../config';
import {parseMessage, Play, Pause, Stats, Disconnected, StatsResponses, RequestStats, PlayerState} from '../messages';
import User from '../user';
import WebsocketWrapper from '../websocket';

import './Cinema.css';
import SideContent from './SideContent';
import { timingSafeEqual } from 'crypto';
import { removeRoomFromUrl } from '../utils';


interface State {
    isPlaying: boolean;
    inParty: boolean;
    isDirector: boolean;
    showModal: boolean;
    roomCode: string|undefined;
    name: string;
    connectedUsers: Array<User>;
    directorName: string|undefined;
    showSideWindow: boolean;
}

interface Props {
    videoSource: string;
};

function getRoomFromLocalStorage(): string|undefined {
    const storedRoom = window.localStorage.getItem(Config.localStorageKeys.roomCode) ?? undefined;
    console.debug(`Room in localStorage = '${storedRoom}'`);
    return storedRoom;
}

function getRoomFromUrlParams(): string|undefined {
    const urlParams = new URLSearchParams(window.location.search);
    // TODO store room url param name in config
    const room = urlParams.get('room') ?? undefined;
    console.debug(`Room in urlParams = '${room}'`);
    return room;
}

class Cinema extends React.Component<Props, State> {

    websocket: WebsocketWrapper|undefined;
    // videoSource: string;
    justJoined: boolean;

    constructor(_props: Props) {
        super(_props);
        this.websocket = undefined;
        // this.videoSource = "http://localhost:5000/browse/4K%20Video%20Downloader/The%20Cure%20-%20A%20Forest%20(Official%20Video).mp4";
        this.justJoined = false;

        const roomCode = getRoomFromUrlParams();
        const roomCodeFromStorage = getRoomFromLocalStorage();

        // Only the director has the room code stored. If it equals the room code from the URL Params then this person
        // is the director.
        var isDirector = false;
        if (roomCode === roomCodeFromStorage && roomCode !== undefined) {
            console.log("Room code in URL matches code in storage, user is director");
            isDirector = true;
        } else {
            // If the codes don't match, remove it.
            window.localStorage.removeItem(Config.localStorageKeys.roomCode);
        }

        if (roomCode) {
            console.log("Room code found in URL, creating websocket connection");
            this.websocket = this.createWebsocket(roomCode);
        }

        // If there's a room code in the URL then this person SHOULD be in a party with others.
        const inParty = roomCode !== undefined;

        this.state = {
            isDirector: isDirector,
            isPlaying: false,
            inParty: inParty,
            showModal: false,
            roomCode: roomCode,
            name: window.localStorage.getItem('user') ?? "user",
            connectedUsers: [],
            directorName: undefined,
            showSideWindow: true,
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
            default: {
                console.log(`No action taken for message ${e.data}`);
                break; 
            }
        }
    };

    roomCreated(roomCode: string) {
        const newUrl = `${window.location.origin}${window.location.pathname}?video=${this.props.videoSource}&room=${roomCode}`;
        window.history.replaceState('', '', newUrl);
        window.localStorage.setItem(Config.localStorageKeys.roomCode, roomCode);
        this.websocket = this.createWebsocket(roomCode);
        this.setState({isDirector: true, inParty: true, roomCode: roomCode});
    };

    leaveParty() {
        this.setState({
            isDirector: false,
            inParty: false,
            isPlaying: false,
            connectedUsers: [],
        });
        this.websocket?.close();
        removeRoomFromUrl();
    }

    /*
    Create the VideoPlayer component and configure it according to if and how the user
    is connected to the party.
    */
    getVideoPlayer() {
        let onPlay, onPause, onTimeInterval;

        if (this.state.inParty && this.state.isDirector) {
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

            onTimeInterval = (time: number) => {
                this.websocket?.send(new Stats(this.state.name, time, PlayerState.Playing, this.state.isDirector));
                this.websocket?.send(new RequestStats());
            };
        } else if (this.state.inParty) {
            onPlay = () => {};
            onPause = () => {};
            onTimeInterval = (time: number) => {
                this.websocket?.send(new Stats(this.state.name, time, PlayerState.Playing, this.state.isDirector));
                this.websocket?.send(new RequestStats());
            };
        } else {
            onPlay = () => this.setState({isPlaying: true});
            onPause = () => this.setState({isPlaying: false});
            onTimeInterval = () => {};
        }

        return <VideoPlayer
            playing={this.state.isPlaying}
            source={this.props.videoSource}
            onPlay={onPlay}
            onPause={onPause}
            onTimeInterval={onTimeInterval}
        />
    }

    getSideWindow() {
        if (!this.state.showSideWindow) return null;
        return (
            <SideContent 
                roomCreatedCallback={(roomCode) => this.roomCreated(roomCode)}
                leaveButtonCallback={() => this.leaveParty()}
                hideCallback={() => this.setState({showSideWindow: false})}

                connectedUsers={this.state.connectedUsers}
                name={this.state.name}
                inParty={this.state.inParty}
                room={this.state.roomCode}
                directorName={this.state.directorName}
                isDirector={this.state.isDirector}
            />
        );
    }

    render() {
        let partyInfo = null;
        if (this.state.isDirector) {
            partyInfo = (
                <p>
                    <b>Connected to room {this.state.roomCode}</b>
                    <br />
                    You are the director, when you press play the video will play for everyone who is connected.
                    When you pause it will pause for everyone, etc.
                </p>
            );
        } else if (this.state.inParty) {
            partyInfo = (
                <p>
                    <b>Connected to room {this.state.roomCode}</b>
                    <br />
                    Someone else is controlling your video player. The video will play when they press play.
                </p>
            );
        }


        return (
            <Fragment>
                <ModalPopup show={this.state.showModal} onClose={() => this.setState({ showModal: false })}>
                    <CreateRoom roomCreatedCallback={(roomCode) => this.roomCreated(roomCode)} />
                </ModalPopup>

                <div className="cinema-container">
                    {this.getVideoPlayer()}
                    {/* {partyInfo} */}
                    {this.getSideWindow()}
                </div>
            </Fragment>
        );
    }
}


export default Cinema;
