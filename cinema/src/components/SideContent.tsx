import React, { Fragment, useState } from 'react';
import User from '../user';
import UsersTable from './UsersTable';
import Config from '../config';

import './SideContent.css';

interface Props {
    roomCreatedCallback: (room: string) => void;
    hideCallback: () => void;
    leaveButtonCallback: () => void;
    pauseCallback: () => void;
    setUserNameCallback: (name: string) => void;
    connectedUsers: User[];
    name: string;
    inParty: boolean;
    room: string | undefined;
    isDirector: boolean;
    directorName?: string;
}


export default (props: Props) => {
    const b64Path = btoa(window.location.pathname);
    const url = `/${Config.createRoomEndpoint}?url=${b64Path}`;
    // const [showModal, setShowModal] = useState(false);
    const [nameInput, setNameInput] = useState(props.name);

    const getUsernameInput = () => {
        return (
            <form onSubmit={(e) => e.preventDefault()}>
                <input
                    type="text"
                    onChange={(e) => setNameInput(e.target.value)}
                    minLength={1}
                    maxLength={15}
                    value={nameInput}
                />
                <button onClick={(_e) => props.setUserNameCallback(nameInput)}>
                    Set username
                        </button>
            </form>
        );
    }

    const getRoomInfo = () => {
        let msg;
        if (props.directorName && !props.isDirector) {
            msg = (<p>
                Hi <b>{props.name}</b>. You are connected to <b>{props.room}</b>.
                Your video synchronised with <b><u>{props.directorName}</u></b>.
            </p>);
        } else {
            msg = (
                <p>
                    Hi <b>{props.name}</b>. You are connected to room <b>{props.room}</b>.
                </p>
            );
        }

        return (
            <div>
                {getUsernameInput()}
                {msg}
                <button className="side-content-button side-content-hide-button" onClick={props.leaveButtonCallback}>
                    Leave
                </button>
            </div>
        );
    }

    const getCreatePartyInfo = () => {
        return (
            <Fragment>
                <h5>
                    Create a party and share the URL to watch this video together
                    with your friends.
                </h5>
                <h5>
                    When in a party your video player will be synchronised with
                    the other people in the party.
                </h5>
                <div className="side-content-header-buttons">
                    <button
                        className="side-content-button side-content-create-button"
                        onClick={() => {
                            // setShowModal(true);
                            createClicked();
                        }}>
                        Create a party
                    </button>
                    <button
                        className="side-content-button side-content-hide-button"
                        onClick={props.hideCallback} >
                        Hide
                    </button>
                </div>
            </Fragment>
        );
    }

    // const getUsernameModal = () => {
    //     return (
    //         <ModalPopup
    //             onClose={() => setShowModal(false)}
    //             show={showModal}
    //             classNamePrefix="side-content-"
    //         >
    //             <div>
    //                 <h5>Enter username</h5>
    //                 <form onSubmit={(e) => e.preventDefault()}>
    //                     <input
    //                         onChange={(e) => setNameInput(e.target.value)}
    //                         maxLength={20}
    //                         minLength={1}
    //                     />
    //                 </form>
    //             </div>
    //         </ModalPopup>
    //     );
    // }

    const getUsersTable = () => {
        if (!props.inParty) return null;
        return <UsersTable users={props.connectedUsers} />;
    }

    const roomCreated = (result: any) => {
        if (props.roomCreatedCallback) props.roomCreatedCallback(result.room);
    }

    const roomCreationError = (_e: any) => {
        // setShowCreateButton(false);
        // setShowError(true);
    }

    const sendCreateRequest = () => {
        fetch(url)
            .then(res => res.json())
            .then(
                roomCreated,
                roomCreationError,
            );
    }

    const createClicked = () => {
        // Pause video playback
        if(props.pauseCallback) props.pauseCallback();
        sendCreateRequest();
    }

    const header = props.inParty ? getRoomInfo() : getCreatePartyInfo();

    return (
        <div className="side-content">
            {/* {getUsernameModal()} */}
            <div className="side-content-header">
                {header}
            </div>
            <div className="side-content-main">
                {getUsersTable()}
            </div>
        </div>
    );
}