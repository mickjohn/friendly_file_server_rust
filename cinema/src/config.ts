interface Config {
    wsUrl: string,
    createRoomEndpoint: string,
    checkRoomEndpoint: string,
    localStorageKeys: {
        roomCode: string,
    }
    hide_controls_timeout: number,
    stats_update_interval: number,
    redirect_target: string,
}

const DevConfig: Config = {
    wsUrl: 'ws://localhost:5000/rooms',
    createRoomEndpoint: 'createroom',
    checkRoomEndpoint: 'checkroom',
    localStorageKeys: {
        roomCode: 'room'
    },
    hide_controls_timeout: 1500,
    stats_update_interval: 1000,
    redirect_target: '/browse',
}

const PrdConfig: Config = {
    wsUrl: `wss://${document.domain}:5001/rooms`,
    createRoomEndpoint: 'createroom',
    checkRoomEndpoint: 'checkroom',
    localStorageKeys: {
        roomCode: 'room'
    },
    hide_controls_timeout: 1500,
    stats_update_interval: 1000,
    redirect_target: '/browse',
}


export default DevConfig;