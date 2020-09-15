const DevConfig = {
    wsUrl: 'ws://127.0.0.1:5000/rooms/'
}

const PrdConfig = {
    wsUrl: `wss://${document.domain}:5001/rooms/`,
}


export default DevConfig;