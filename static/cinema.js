
// window.addEventListener('load', (event) => {
$(document).ready( (event) => {
    /* Global Vars */
    var socket = null;
    var name = "user";
    var roomCode = null;
    var justJoined = true;
    var skipStatUpdate = false;
    var isDirector = false;
    var isGuest = false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('room') !== null) {
        roomCode = urlParams.get('room');
        initialiseWebsocket(roomCode);
        enableGuestMode();
        initSideWindow(roomCode, false);
    }


    /************/
    /* Elements */
    /************/
    const player = document.getElementById("player");
    const modal = document.getElementById("myModal");
    const roomCodeInputs = document.getElementsByClassName("room-code-link");
    const copyButtons = document.getElementsByClassName("copy-to-clipboard");

    /*******************/
    /* Event listeners */
    /*******************/
    $('#set-name').click( (_e) => {
        const nameInput = document.getElementById("name-input");
        if (nameInput.checkValidity()) {
            name = nameInput.value;
            document.getElementById('name-title').innerText = `Username: ${name}`;
        }
    });

    $('#show-cinema-info').click( (_e) => {
        $('#myModal').fadeIn('fast');
    });

    $('.close').click( (_e) => {
        $('#myModal').fadeOut('fast');
    });

    $('#video-controls').attr("data-state", "visible");


    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal) {
            $('#myModal').fadeOut("fast")
        }
    }

    /* Button to copy the room code to clipboard */
    for (var elem of copyButtons) {
        elem.addEventListener('click', (e) => {
            roomCodeInputs[0].select();
            document.execCommand('copy');
        });
    }

    $('#mute').click(function(e) {
        player.muted = !player.muted;
        changeButtonState('mute');
    });

    $('#playpause').click(function (e) {
        if (player.paused || player.ended) {
            if (isDirector) {
                play();
            } else {
                player.play();
            }
        } else {
            if (isDirector) {
                pause();
            } else {
                player.pause();
            }
        }
    });

    $('#fs').click( (e) => {
        handleFullscreen();
    });

    player.addEventListener('pause', (e) => {
        changeButtonState(player, 'playpause');
        console.log(e)
    });

    player.addEventListener('playing', (e) => { console.log(e) });

    player.addEventListener('play', (e) => {
        changeButtonState(player, 'playpause');
        console.log(e);
    });

    player.addEventListener('progress', (e) => { console.log(e) });
    player.addEventListener('stalled', (e) => { console.log(e) });
    player.addEventListener('suspend', (e) => { console.log(e) });

    $('#progress').click(function (e) {
        if (!isGuest) {
            var pos = (e.pageX - (this.offsetLeft + this.offsetParent.offsetLeft)) / this.offsetWidth;
            player.currentTime = pos * player.duration;
        }
    });

    player.addEventListener('volumechange', function() {
        checkVolume(player);
    }, false);

    player.addEventListener('loadedmetadata', function() {
        $('#progress').attr('max', player.duration);
        $('#totalTime').text(' / ' + toMovieTime(player.duration));
    });

    player.addEventListener('timeupdate', (e) => {
        $('#currentTime').text(toMovieTime(player.currentTime));
        $('#progress').val(player.currentTime);
        const width = Math.floor((player.currentTime / player.duration) * 100) + '%';
        console.log(`width = ${width}`);
        $('#progress-bar').css('width', width);

        if (socket !== null && socket.readyState === WebSocket.OPEN) {
            if (skipStatUpdate) {
                skipStatUpdate = false;
            } else {
                skipStatUpdate = true;
                console.log('Sending stats message')
                const time = player.currentTime;
                const data = { user: name, data: { control: 'STATS', time: time } };
                socket.send(JSON.stringify(data));
            }
        }
    });

    player.addEventListener('suspend', function() {
        if (socket !== null && (isGuest ||  isDirector)) {
            const time = player.currentTime;
            const data = { user: name, data: { control: 'STATS', time: time } };
            socket.send(JSON.stringify(data));
        }
    });

    // Set the video container's fullscreen state
    var setFullscreenData = function (state) {
        $('#videoContainer').attr('data-fullscreen', !!state);
        $('#fs').attr('data-state', !!state ? 'cancel-fullscreen' : 'go-fullscreen');
    }

    // Checks if the document is currently in fullscreen mode
    function isFullScreen () {
        return !!(document.fullScreen || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement || document.fullscreenElement);
    }

    // Fullscreen
    function handleFullscreen () {
        // If fullscreen mode is active...	
        const videoContainer = document.getElementById('videoContainer');
        if (isFullScreen()) {
            // ...exit fullscreen mode
            // (Note: this can only be called on document)
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
            else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
            setFullscreenData(false);
        }
        else {
            // ...otherwise enter fullscreen mode
            // (Note: can be called on document, but here the specific element is used as it will also ensure that the element's children, e.g. the custom controls, go fullscreen also)
            if (videoContainer.requestFullscreen) videoContainer.requestFullscreen();
            else if (videoContainer.mozRequestFullScreen) videoContainer.mozRequestFullScreen();
            else if (videoContainer.webkitRequestFullScreen) {
                player.webkitRequestFullScreen();
            }
            else if (videoContainer.msRequestFullscreen) videoContainer.msRequestFullscreen();
            setFullscreenData(true);
        }
    }

    // Send play message to websocket server
    function play() {
        if (socket === null) { return; }
        console.debug("Sending PLAY message to WS server");
        const data = { user: name, data: { control: 'PLAY' } };
        socket.send(JSON.stringify(data));
    }

    // Send pause message to websocket server
    function pause() {
        if (socket === null) { return; }
        const data = { user: name, data: { control: 'PAUSE' } };
        console.debug("Sending PAUSE message to WS server");
        socket.send(JSON.stringify(data));
    }

    // Send seeked message and current time to websocket server
    function seeked() {
        if (socket === null) { return; }
        console.log('Sending seeked message')
        time = player.currentTime;
        const data = { user: name, data: { control: 'SEEKED', time: time } };
        socket.send(JSON.stringify(data));
    }

    // Update the stats table with the timestamps of the different users
    function update_stats(data) {
        const statsTable = document.getElementById("stats");
        const name = data['user'];
        const time = data['time'];
        const id = data['id'];

        if (justJoined && time != '0') {
            justJoined = false;
            const time_f = parseFloat(time) + 1;
            console.log(`Just joined. Setting current time to ${time_f}`);
            console.log(`Just joined. time is ${data['time']}`);
            player.currentTime = time_f;
            player.play();
        }

        const rowToDelete = document.getElementById(id);
        var index = statsTable.rows.length;
        if (rowToDelete !== null) {
            index = rowToDelete.rowIndex;
            statsTable.deleteRow(index);
        }

        var newRow = statsTable.insertRow(index);
        newRow.id = id;
        var cell1 = newRow.insertCell(0);
        var cell2 = newRow.insertCell(1);

        cell1.innerText = name;
        cell2.innerText = toNiceTime(time);
    }


    function clearAllRows() {
        const statsTable = document.getElementById("stats");
        while (statsTable.rows.length > 1) {
            statsTable.deleteRow(1);
        }
    }

    $("#create-room").click(function () {
        console.debug("create-room button clicked");
        const b64Path = btoa(location.pathname);
        const url = `${location.protocol}//${document.domain}:${location.port}/createroom?path=${b64Path}`;
        const httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
                if (httpRequest.status === 200) {
                    const resp = JSON.parse(httpRequest.responseText);
                    roomCode = resp['room'];
                    initialiseWebsocket(roomCode);
                    enableDirectorMode()

                    initSideWindow(roomCode, isDirector);
                } else {
                    alert('There was a problem with the request.');
                }
            }
        };
        httpRequest.open('GET', url, true);
        httpRequest.send();
    });

    /*
    Takes a room code and creates the websocket connection and creates the
    callback functions.
    */
    function initialiseWebsocket(wsRoomCode) {
        console.log("Initialising websocket");
        if (document.domain === 'localhost' || document.domain === '127.0.0.1') {
            var wsUrl = 'ws://127.0.0.1:5001/cinema/' + wsRoomCode;
        } else {
            var wsUrl = 'wss://' + document.domain + ':5001/cinema/' + wsRoomCode;
        }
        console.debug(`websocket URL = ${wsUrl}`);
        socket = new WebSocket(wsUrl);
        socket.addEventListener('message', (event) => {
            console.log(`received ${event.data}`);
            const msg = JSON.parse(event.data);

            const control = msg.data;
            if (control === 'STATS') {
                update_stats(msg);
            } else if (control === 'PLAY') {
                console.log('Playing')
                player.play();
            } else if (control === 'PAUSE') {
                console.log('Pausing')
                player.pause();
            } else if (control === 'SEEKED') {
                if (!isDirector) {
                    const t = msg.time;
                    console.log(`Seek time = ${t}`);
                    player.currentTime = t;
                }
            } else if (control === 'LEAVING') {
                console.log("Deleting user row");
                var id = msg['id'];
                if (id !== null) {
                    console.log(`Deleting user row ${id}`);
                    clearAllRows();
                }
            }
        });

        socket.addEventListener('open', (event) => {
            console.log("Websocket opening!!");
            const data = { user: name, data: { control: 'SEEKED', time: 0 } };
            socket.send(JSON.stringify(data));
        });

        socket.addEventListener('close', (event) => {
            console.log("Websocket closing!!");
        });
    }

    function enableDirectorMode() {
        // Set global vars
        isDirector = true;
        name = "director";

        // Update elements that should be visible to the director
        const directorElements = document.getElementsByClassName('show-if-director');

        for (var elem of directorElements) {
            elem.setAttribute('data-state', 'visible');
        }


        // Add 'seek' listeners to the player
        player.addEventListener('seeked', function (e) {
            console.log(e)
            pause();
            seeked();
        });

        player.addEventListener('seeking', function (e) {
            pause();
            console.log(e)
        });
    }

    function enableGuestMode() {
        isGuest = true;
        $("#playpause").hide();
    };

    function createWwfUrl(roomCode) {
        const location = window.location;
        if (location.port === '') {
            var url = `${location.protocol}//${document.domain}/wwf/${roomCode}`;
        } else {
            var url = `${location.protocol}//${document.domain}:${location.port}/wwf/${roomCode}`;
        }
        return url;
    }

    function initSideWindow(roomCode, isDirector) {
        var url = createWwfUrl(roomCode);
        $("#room-code-box").slideDown("fast");
        $("#room-code-box-side-window").text(createWwfUrl(roomCode));
        $(".show-if-wwf").attr("data-state", "visible");
        $(".room-code-link").val(url);
    }

});

function checkVolume(video, dir) {
    if (dir) {
        var currentVolume = Math.floor(video.volume * 10) / 10;
        if (dir === '+') {
            if (currentVolume < 1) video.volume += 0.1;
        }
        else if (dir === '-') {
            if (currentVolume > 0) video.volume -= 0.1;
        }
        // If the volume has been turned off, also set it as muted
        // Note: can only do this with the custom control set as when the 'volumechange' event is raised, there is no way to know if it was via a volume or a mute change
        if (currentVolume <= 0) video.muted = true;
        else video.muted = false;
    }
    changeButtonState(video, 'mute');
}

function alterVolume(video, dir) {
    checkVolume(dir);
}

function changeButtonState(video, type) { // Play/Pause button
    if (type == 'playpause') {
        if (video.paused || video.ended) {
            $('#playpause').attr('data-state', 'play');
        }
        else {
            $('#playpause').attr('data-state', 'pause');
        }
    }
    // Mute button
    else if (type == 'mute') {
        $('#mute').attr('data-state', video.muted ? 'unmute' : 'mute');
    }
}

/*
Turn a float of seconds into a human friendly "00h 00h 00.0s" string
*/
function toNiceTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / (60 * 60))
    const minutes = Math.floor((totalSeconds / 60) - (hours * 60));
    const seconds = (totalSeconds - (hours * 60 * 60) - (minutes * 60)).toFixed(1);
    return `${hours.toString(10).padStart(2, '0')}h ${minutes.toString(10).padStart(2, '0')}m ${seconds.toString(10).padStart(4, '0')}s`;
} 

/*
Turn a float of seconds into a movie timestamp like "01:45:14" string
*/
function toMovieTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / (60 * 60))
    const minutes = Math.floor((totalSeconds / 60) - (hours * 60));
    const seconds = Math.floor(totalSeconds - (hours * 60 * 60) - (minutes * 60));
    return `${hours.toString(10).padStart(2, '0')}:${minutes.toString(10).padStart(2, '0')}:${seconds.toString(10).padStart(2, '0')}`;
}