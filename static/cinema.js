/* Global Vars */
var hideVideoControlsTimeout = null;
var mouseOverControls = false;

// window.addEventListener('load', (event) => {
$(document).ready( (event) => {
    /************/
    /* Elements */
    /************/
    const player = document.getElementById("player");
    const modal = document.getElementById("myModal");
    const roomCodeInputs = document.getElementsByClassName("room-code-link");
    const copyButtons = document.getElementsByClassName("copy-to-clipboard");
    const progressBar = document.getElementById("progress");


    /* More Global Vars */
    var socket = null;
    var localStorageName = window.localStorage.getItem("username");

    // Fetch the username from localStorage if it's set, and update the page
    var name = localStorageName === null ? 'user' : localStorageName;
    document.getElementById('name-title').innerText = `Username: ${name}`;

    var roomCode = null;
    var justJoined = true;
    var isDirector = false;
    var isGuest = false;
    var statsInterval = null;

    /*
    Check the URL & local storage for watch-with-friends related query params.
    Use this info to re-enable watch-with-friends mode after it the page has
    been refreshed.
    */
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('room') !== null) {
        roomCode = urlParams.get('room');
        initialiseWebsocket(roomCode);
        var reenableAsDirector = false;

        var storedRoom = JSON.parse(localStorage.getItem('room'));
        if (storedRoom !== null) {
            console.debug("Found stored room..");
            var storedRoomCode = storedRoom.roomCode;
            var storedIsDirector = storedRoom.isDirector;
            // Restore this user to director
            if (storedRoomCode === roomCode && storedIsDirector) {
                reenableAsDirector = true;
            } else {
                localStorage.removeItem('room');
            }
        }

        if (reenableAsDirector) {
            console.debug("Restoring this user as director");
            enableDirectorMode();
        } else {
            console.debug("This user is a guest");
            enableGuestMode();
        }

        initSideWindow(roomCode, false);
    }



    /*******************/
    /* Event listeners */
    /*******************/
    $('#set-name').click( (_e) => {
        const nameInput = document.getElementById("name-input");
        if (nameInput.checkValidity()) {
            name = nameInput.value;
            window.localStorage.setItem('username', name);
            document.getElementById('name-title').innerText = `Username: ${name}`;
        }
    });

    /* Hide video controls when mouse leaves the video*/
    $(".video-and-controls").hover(function (event) {
        if (!isFullScreen()) {
            if (event.type === "mouseenter") {
                $(".controls").fadeIn('fast');
            } else if (event.type === "mouseleave") {
                if (!player.paused) {
                    $(".controls").fadeOut('fast');
                }
            }
        }
    });

    /* If in fullscreen show the controls if mouse if over them */
    $("#video-controls").hover(function (event) {
        if (isFullScreen()) {
            if (event.type === "mouseenter") {
                clearInterval(hideVideoControlsTimeout);
                hideVideoControlsTimeout = null;
                mouseOverControls = true;
            } else if (event.type === "mouseleave") {
                mouseOverControls = false;
            }
        }
    });

    $('#show-cinema-info').click( (_e) => {
        $('#myModal').fadeIn('fast');
    });

    $('.close').click( (_e) => {
        $('#myModal').fadeOut('fast');
    });

    $('#video-controls').attr("data-state", "visible");

    $('#voldec').click( () => {
        if (player.volume <= 0.1 ) {
            player.volume = 0;
        } else {
            player.volume = player.volume - 0.1;
        }
        $('#volume').text(`${Math.floor(player.volume * 100)}%`);
    });

    $('#volinc').click( () => {
        if (player.volume >= 0.9 ) {
            player.volume = 1;
        } else {
            player.volume = player.volume + 0.1;
        }
        $('#volume').text(`${Math.floor(player.volume * 100)}%`);
    });


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
    });

    player.addEventListener('play', (e) => {
        changeButtonState(player, 'playpause');
    });

    $('#progress').click(function (e) {
        if (!isGuest) {
            const p_dimensions = progressBar.getBoundingClientRect();
            const width = this.offsetWidth;
            const normalisedX = e.pageX - p_dimensions.x;
            const percentage = normalisedX / width;
            player.currentTime = player.duration * percentage;
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
        $('#progress').attr('max', player.duration);
        $('#progress').val(player.currentTime);
        $('#totalTime').text(' / ' + toMovieTime(player.duration));
        $('#currentTime').text(toMovieTime(player.currentTime));

        // const width = Math.floor((player.currentTime / player.duration) * 100) + '%';
        // $('#progress-bar').css('width', width);
    });

    player.addEventListener('suspend', function() {
        if (socket !== null && (isGuest ||  isDirector)) {
            const time = player.currentTime;
            const data = { name: name, type: 'Stats', time: time };
            socket.send(JSON.stringify(data));
        }
    });

    // Set the video container's fullscreen state
    var setFullscreenData = function (state) {
        $('#videoContainer').attr('data-fullscreen', !!state);
        $('#fs').attr('data-state', !!state ? 'cancel-fullscreen' : 'go-fullscreen');
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
            $(".video-and-controls").unbind('mousemove');
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
            $(".video-and-controls").bind('mousemove', hideControlsInFullscreen);
            setFullscreenData(true);
        }
    }

    // Send play message to websocket server
    function play() {
        if (socket === null) { return; }
        const data = { name: name, type: 'Play'};
        socket.send(JSON.stringify(data));
    }

    // Send pause message to websocket server
    function pause() {
        if (socket === null) { return; }
        const data = { name: name, type: 'Pause' };
        socket.send(JSON.stringify(data));
    }

    // Send seeked message and current time to websocket server
    function seeked() {
        if (socket === null) { return; }
        time = player.currentTime;
        const data = { name: name, type: 'Seeked', time: time };
        socket.send(JSON.stringify(data));
    }

    // Update the stats table with the timestamps of the different users
    function update_stats(data) {
        const statsTable = document.getElementById("stats");
        const name = data['name'];
        const time = data['time'];
        const id = data['id'];

        if (justJoined && time != '0') {
            justJoined = false;
            const time_f = parseFloat(time) + 1;
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
        const b64Path = btoa(location.pathname);
        const url = `${location.protocol}//${document.domain}:${location.port}/createroom?url=${b64Path}`;
        const httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
                if (httpRequest.status === 200) {
                    const resp = JSON.parse(httpRequest.responseText);
                    roomCode = resp['room'];
                    initialiseWebsocket(roomCode);
                    enableDirectorMode()
                    initSideWindow(roomCode, isDirector);
                    $('#exit-wwf').show();
                    $('#show-cinema-info').hide();
                } else {
                    alert('There was a problem with the request.');
                }
            }
        };
        httpRequest.open('GET', url, true);
        httpRequest.send();
    });

    $("#exit-wwf").click(function() {
        // Show the watch with friends button again
        $('#show-cinema-info').show();

        // Hide the side window
        hideSideWindow();

        // Remove room code from url
        const url = `${window.location.origin}${window.location.pathname}?cinema=1`;
        history.replaceState('', '', url);

        // Delete localstorage
        window.localStorage.removeItem('room');

        // Close the websocket
        if (socket !== null) {
            socket.close();
        }

        // Clear the usernames from the table
        clearAllRows();

        // Finally, hide this button!
        $(this).hide();
    });

    /*
    Takes a room code and creates the websocket connection and creates the
    callback functions.
    */
    function initialiseWebsocket(wsRoomCode) {
        console.log("Initialising websocket");
        if (document.domain === 'localhost' || document.domain === '127.0.0.1') {
            var wsUrl = 'ws://127.0.0.1:5000/rooms/' + wsRoomCode;
        } else {
            var wsUrl = 'wss://' + document.domain + ':5001/rooms/' + wsRoomCode;
        }
        socket = new WebSocket(wsUrl);
        socket.addEventListener('message', (event) => {
            const msg = JSON.parse(event.data);

            const control = msg.type;
            if (control === 'StatsResponse') {
                update_stats(msg);
            } else if (control === 'Play') {
                console.log('Playing')
                player.play();
            } else if (control === 'Pause') {
                console.log('Pausing')
                player.pause();
            } else if (control === 'Seeked') {
                if (!isDirector) {
                    const t = msg.time;
                    console.log(`Seek time = ${t}`);
                    player.currentTime = t;
                }
            } else if (control === 'Disconnected') {
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
            const data = { name: name, type: 'SEEKED', time: -1 };
            socket.send(JSON.stringify(data));

            // Setup the stats reporting interval
            if (statsInterval === null) {
                statsInterval = setInterval(sendStats, 500);
            }
        });

        socket.addEventListener('close', (event) => {
            console.log("Websocket closing!!");
        });
    }

    function enableDirectorMode() {
        // Set global vars
        isDirector = true;

        // Add the room code as a query param to the URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('room') === null) {
            const newUrl = `${window.location.href}&room=${roomCode}`; 
            window.history.replaceState('', '', newUrl);
        }

        // Store room code and isDirector in local storage. This can be used
        // If the director refreshes the page.
        const objToStore = JSON.stringify({'roomCode': roomCode, 'isDirector': isDirector});
        localStorage.setItem('room', objToStore);

        // Update elements that should be visible to the director
        const directorElements = document.getElementsByClassName('show-if-director');

        for (var elem of directorElements) {
            elem.setAttribute('data-state', 'visible');
        }

        // Add 'seek' listeners to the player
        player.addEventListener('seeked', function (e) {
            pause();
            seeked();
        });

        player.addEventListener('seeking', function (e) {
            pause();
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

    function hideSideWindow() {
        $("#room-code-box").hide()
        $("#room-code-box-side-window").text('');
        $(".show-if-wwf").attr("data-state", "hidden");
        $(".show-if-director").attr("data-state", "hidden");
        $(".room-code-link").val('');
    }

    function sendStats() {
        if (socket !== null && socket.readyState === WebSocket.OPEN) {
            const time = player.currentTime;
            const data = { name: name, type: 'Stats', time: time };
            socket.send(JSON.stringify(data));
        }
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

// Checks if the document is currently in fullscreen mode
function isFullScreen () {
    return !!(document.fullScreen || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement || document.fullscreenElement);
}

/*
Show the video controls when the mouse moves in fullscreen 
This function is bound to a mousemove event which can be triggered hundreds of
times a second. It should be unbound when not in fullscreen, and bound when 
entering fullscreen.
*/
function hideControlsInFullscreen() {
    const player = document.getElementById("player");
    if (isFullScreen()) {
        if (hideVideoControlsTimeout !== null) {
            clearTimeout(hideVideoControlsTimeout);
            hideVideoControlsTimeout = null;
        }
        $(".controls").fadeIn('fast');
        if (!mouseOverControls && !player.paused) {
            hideVideoControlsTimeout = window.setTimeout(function () {
                console.debug("timeout called, hiding controls");
                $(".controls").fadeOut('fast');
                hideVideoControlsTimeout = null;
            }, 1500);
        }
    }
}