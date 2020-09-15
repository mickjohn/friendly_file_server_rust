import React, {Fragment, useState} from 'react';
import ReactDOM from 'react-dom';
import VideoPlayer from './components/VideoPlayer';


const App = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [inParty, setInParty] = useState(false);
    const [isDirectoy, setIsDirector] = useState(false);

    // const videoSource = "http://localhost:5000/browse/Predator%202%20(1990)%20[1080p]/Predator.2.1990.1080p.BrRip.x264.bitloks.YIFY.mp4";
    const videoSource = "http://localhost:5000/browse/4K%20Video%20Downloader/The%20Cure%20-%20A%20Forest%20(Official%20Video).mp4";

    const getVideoPlayer = () => {
        if (inParty) {
            return (
                <VideoPlayer
                    playing={isPlaying}
                    source={videoSource}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />
            );
        } else {
            return (
                <VideoPlayer
                    playing={isPlaying}
                    source={videoSource}
                />
            )
        }
    }

    return (
        <Fragment>
            { getVideoPlayer()}
            <h1> Watch with friends</h1>
            <button>WWF!</button>
        </Fragment>
    );
}

ReactDOM.render(<App />, document.querySelector('#root'));
