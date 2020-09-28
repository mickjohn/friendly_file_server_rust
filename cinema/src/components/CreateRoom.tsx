import React, { useState } from 'react';
import Config from '../config';

interface Props {
    roomCreatedCallback?: (room: string) => void;
}


const CreateRoom = (props: Props) => {

    let [showCreateButton, setShowCreateButton] = useState(true);
    let [showCode, setShowCode] = useState(false);
    let [roomCode, setRoomCode] = useState(null);
    let [showError, setShowError] = useState(false);

    const b64Path = btoa(window.location.pathname);
    const url = `/${Config.createRoomEndpoint}?url=${b64Path}`;

    const roomCreated = (result: any) => {
        setRoomCode(result.room);
        setShowCreateButton(false);
        setShowCode(true);
        if (props.roomCreatedCallback) props.roomCreatedCallback(result.room);

    }

    const roomCreationError = (_e: any) => {
        setShowCreateButton(false);
        setShowError(true);
    }

    const sendCreateRequest = () => {
        fetch(url)
            .then(res => res.json())
            .then(
                roomCreated,
                roomCreationError,
            );
    }

    const getButton = () => {
        if (showCreateButton) {
            return <button onClick={() => sendCreateRequest()}>Create Room!</button>;
        } else {
            return null;
        }
    }

    const codeField = showCode ? <h2>{roomCode}</h2> : null;
    const error = showError ? <h3>Something went wrong :(</h3> : null;


    return (
        <div className="create-room-container">
            <p>
                Create a room to watch this video together with your friends.
            </p>

            {getButton()}
            {codeField}
            {error}
        </div>
    );
}

export default CreateRoom;

    // $("#create-room").click(function () {
    //     const b64Path = btoa(location.pathname);
    //     const url = `${location.protocol}//${document.domain}:${location.port}/createroom?url=${b64Path}`;
    //     const httpRequest = new XMLHttpRequest();
    //     httpRequest.onreadystatechange = function () {
    //         if (httpRequest.readyState === XMLHttpRequest.DONE) {
    //             if (httpRequest.status === 200) {
    //                 const resp = JSON.parse(httpRequest.responseText);
    //                 roomCode = resp['room'];
    //                 initialiseWebsocket(roomCode);
    //                 enableDirectorMode()
    //                 initSideWindow(roomCode, isDirector);
    //                 $('#exit-wwf').show();
    //                 $('#show-cinema-info').hide();
    //             } else {
    //                 alert('There was a problem with the request.');
    //             }
    //         }
    //     };
    //     httpRequest.open('GET', url, true);
    //     httpRequest.send();
    // });
