import React from 'react';

import ProgressBar from './ProgressBar';

// Resources
import './VideoPlayer.css';
import PlayIcon from '../icons/play_icon.svg';
import PauseIcon from '../icons/pause_icon.svg';
import FullScreenIcon from '../icons/fullscreen.svg';
import ExitFullScreenIcon from '../icons/exit_fullscreen.svg';
import VolumeMutedIcon from '../icons/volume_muted.svg';
import VolumeIcon from '../icons/volume_icon.svg';

class Props {
    source: string;
    playing: boolean;
    onPlay?: () => void;
    onPause?: () => void;
    onSeek?: () => void;
    onTimeUpdate?: () => void;

    constructor(
        source: string,
        playing = true,
    ) {
        this.source = source;
        this.playing = playing;
    }
}

class State {
    playing: boolean;
    volume: number;
    fullscreen: boolean;
    currentTime: number;
    duration: number;

    constructor(
        playing: boolean,
        volume: number,
        fullscreen: boolean,
        currentTime: number,
        duration: number,
    ) {
        this.playing = false;
        this.volume = volume;
        this.fullscreen = fullscreen;
        this.currentTime = currentTime;
        this.duration = duration;
    }

}

function toMovieTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / (60 * 60))
    const minutes = Math.floor((totalSeconds / 60) - (hours * 60));
    const seconds = Math.floor(totalSeconds - (hours * 60 * 60) - (minutes * 60));
    return `${hours.toString(10).padStart(2, '0')}:${minutes.toString(10).padStart(2, '0')}:${seconds.toString(10).padStart(2, '0')}`;
}

class VideoPlayer extends React.Component<Props, State> {

    videoRef: React.RefObject<HTMLVideoElement>;
    lastVolume: number;

    constructor(props: Props) {
        super(props);
        this.videoRef = React.createRef();
        this.lastVolume = 1.0;
        this.state = {
            playing: props.playing,
            volume: 1.0,
            fullscreen: false,
            currentTime: 0,
            duration: 0,
        };
    }

    componentDidMount() {
        const videoElem = this.videoRef.current;
        if (videoElem !== null) {
            videoElem.addEventListener('play', () => this.setState({ playing: true }));
            videoElem.addEventListener('pause', () => this.setState({ playing: false }));

            videoElem.addEventListener('volumechange', () => this.setState({ volume: videoElem.volume }));
            videoElem.addEventListener('loadedmetadata', () => this.setState({ duration: videoElem.duration }));
            videoElem.addEventListener('timeupdate', () => this.setState({ currentTime: videoElem.currentTime }));

            console.log(`playing state = ${this.state.playing}`);
            if (this.state.playing) {
                videoElem.play();
            } else {
                videoElem.pause();
            }
        }
    }

    onPlayClicked() {
        // If a handler was supplied then use it.
        // Otherwise just call the play function on the HTMLVideo ref
        if (this.props.onPlay !== undefined) {
            this.props.onPlay();
        } else {
            this.videoRef.current?.play();
        }
    }

    onPauseClicked() {
        // If a handler was supplied then use it.
        // Otherwise just call the play function on the HTMLVideo ref
        if (this.props.onPause !== undefined) {
            this.props.onPause();
        } else {
            this.videoRef.current?.pause();
        }
    }


    getPlayPauseButton() {
        if (this.state.playing) {
            return (
                <button id="playpause" onClick={() => this.onPauseClicked()} >
                    <img alt="Pause" src={PauseIcon} />
                </button>
            );
        } else {
            return (
                <button id="playpause" onClick={() => this.onPlayClicked()} >
                    <img alt="Play" src={PlayIcon} />
                </button>
            );
        }
    }

    getVolumeButton() {
        if (this.videoRef.current && this.videoRef.current.volume === 0) {
            return (
                <button onClick={() => this.setVolume(this.lastVolume)}>
                    <img src={VolumeMutedIcon} alt="unmute" />
                </button>
            );
        } else {
            return (
                <button onClick={() => this.setVolume(0)}>
                    <img src={VolumeIcon} alt="mute" />
                </button>
            );
        }
    }

    setVolume(v: number) {
        /* Help set the volume via the slider more accurately*/
        if (v <= 0.02) v = 0;
        else if (v >= 0.98) v = 1.0;

        if (this.videoRef.current !== null) {
            this.lastVolume = this.videoRef.current.volume;
            this.videoRef.current.volume = v;
        }

    }

    setCurrentTime(progress: number) {
        const video = this.videoRef.current;
        if (video !== null) {
            const newTime = video.duration * progress;
            video.currentTime = newTime;
        }
    }


    // Check if the props have updated. If the playing prop has changed then act accordingly
    componentDidUpdate(prevProps: Props) {
        if (this.props.playing !== prevProps.playing) {
            const videoElem = this.videoRef.current;
            if (videoElem !== null) {
                if (this.props.playing) {
                    videoElem.play();
                } else {
                    videoElem.pause();
                }
            }
        }
    }

    render() {
        return (
            <div className="video-container">
                <figure>
                    <div className="video-and-controls">
                        <video ref={this.videoRef} preload="metadata">
                            <source src={this.props.source} type="video/mp4" />
                            Your browser does not support HTML video.
                        </video>

                        <div className="controls">
                            <ProgressBar
                                max={this.state.duration}
                                value={this.state.currentTime}
                                onClick={(p) => this.setCurrentTime(p)}
                                progressBarClass={"video-progress"}
                            />

                            <div>
                                {this.getPlayPauseButton()}
                                {this.getVolumeButton()}

                                {/* The volume slider */}
                                <ProgressBar
                                    max={1}
                                    value={this.state.volume}
                                    progressBarClass="volume-slider"
                                    onClick={(p) => this.setVolume(p)}
                                />
                                <span>{toMovieTime(this.state.currentTime)} / {toMovieTime(this.state.duration)}</span>
                                <button id="fullscreen"><img src={FullScreenIcon} alt="Enter Fullscreen" /></button>
                            </div>
                        </div>
                    </div>
                </figure>
            </div>
        );
    }
}

export default VideoPlayer;