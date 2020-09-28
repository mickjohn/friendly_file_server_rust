interface Config {
    wsUrl: string,
    createRoomEndpoint: 'createroom',
    localStorageKeys: {
        roomCode: string,
    }
    hide_controls_timeout: number,
    stats_update_interval: number,
}

const DevConfig: Config = {
    wsUrl: 'ws://localhost:5000/rooms',
    createRoomEndpoint: 'createroom',
    localStorageKeys: {
        roomCode: 'room'
    },
    hide_controls_timeout: 1500,
    stats_update_interval: 1000,
}

const PrdConfig: Config = {
    wsUrl: `wss://${document.domain}:5001/rooms`,
    createRoomEndpoint: 'createroom',
    localStorageKeys: {
        roomCode: 'room'
    },
    hide_controls_timeout: 1500,
    stats_update_interval: 1000,
}


export default DevConfig;