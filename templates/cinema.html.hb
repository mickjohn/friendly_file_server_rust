<!doctype html>

<html lang="en">

<head>
  <meta charset="utf-8">
  <title>FFS!</title>
  <meta name="description" content="Friendly File Sharer">
  <script src="https://code.jquery.com/jquery-3.5.1.min.js" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>
  <link rel="stylesheet" type="text/css" href="/static/cinema.css">
  <script src="/static/cinema.js"></script> 

</head>

<body>
  <!-- Prefetch SVG images -->
  <!-- https://stackoverflow.com/a/819788 -->
  <div id="image-preload"></div>

  <!-- The Modal -->
  <div id="myModal" class="modal">
    <!-- Modal content -->
    <div class="modal-content">
      <span class="close">&times;</span>
      <p>
      You can use the 'watch with friends' feature to synchronise the video player of you and your friends.
      Your video player will control theirs, so you can watch a video together in sync!.
      </p>
      <p>Just click the button below and share the URL with your friends to get started!</p>
      <button id="create-room">Create</button>

      <div id="room-code-box">
        <input class="room-code-link" type="text" size="36" readonly><button class="copy-to-clipboard">copy</button>
      </div>
    </div>
  </div> 


   <div class="content">
    <h1>Mickflix</h1>

    <div class="player-window">
      <figure id="videoContainer">
        <div class="video-and-controls">
          <video id="player" preload="metadata">
              <source src="{{ mp4_path }}" type="video/mp4">
              Your browser does not support HTML video.
          </video>
          <div id="video-controls" class="controls" data-state="hidden">
            <div class="progress">
                <progress id="progress" value="0" min="0">
                  <span id="progress-bar"></span>
                </progress>
            </div> <!-- progress bar wrapper -->

            <div id="video-control-buttons">
              <button id="playpause" type="button" data-state="play"></button>
              <button id="mute" type="button" data-state="mute"></button>
              <button id="voldec" type="button" data-state="voldown"></button>
              <span id="volume">100%</span>
              <button id="volinc" type="button" data-state="volup"></button>
              <span id="currentTime">00:00:00</span><b id="totalTime"> / 00:00:00</b>
              <button id="fs" type="button" data-state="go-fullscreen"></button>
            </div> <!-- end video buttons -->
          </div> <!-- end video controls -->
        </div> <!-- end video-and-controls -->
      </figure>

      <div class="side-window show-if-wwf" data-state="hidden">
        <div class="side-window-room-code">
          <h5>Room URL</b>
          <p id="room-code-box-side-window"></p>
        </div>
        <h5 id="room-code-box-side-window"></h5>
        <h4 id="name-title">Username: user</h4>
        <label for="name-input"> Set your name (1-12 characters):</label>
        <input name="name-input" id="name-input" type="text" minlength="1" maxlength="8" size="14" pattern="[a-zA-Z0-9 ]+">
        <button id="set-name">Set Name</button>
        <table id="stats">
          <caption> timestamps </caption>
          <tr>
            <th> Name </th>
            <th> Time </th>
          </tr>
        </table>
      </div> <!-- end side-window -->
    </div> <!-- end player window -->

    <div class="video-information"> <!-- watch with friends buttons & info -->
      <h2>{{ mp4_name }}</h2>
      <button id="show-cinema-info">Watch together with your friends</button>
      <button id="exit-wwf">Exit watch with friends mode</button>
      <div class="show-if-director help-box" data-state="hidden">
        <h4>How to use</h4>
        <p>
          When you clicked on the 'Create a room' button a virtual room was
          created on the server. When people click on the URL that you give them
          they will join this virtual room. All of the people in this room will
          be sent your media player controls. When you click play, it will click
          play on their browsers, when you seek it will seek on their browsers,
          and etc. If you close or refresh this page, you will need to create a
          new room.
        </p>
      </div> <!-- End how to use (director) -->

      <div class="show-if-guest" data-state="hidden">
        <h4>How to use</h4>
        <p>
          When the director (i.e., the person who send you the link through which
          you joined), presses play in their browser, your video will start
          playing. When they seek, your video will also seek. When they pause, your
          video will pause. This control isn't bi-directonal, when you play, pause
          or seek, you will only be doing it for your video.
        </p>
      </div> <!-- End how to use (guest) -->
    </div> <!-- End watch with friends buttons & info -->
  </div> <!-- End Content -->
</body>

</html>
