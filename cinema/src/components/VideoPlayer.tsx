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
import Config from '../config';
import { PlayerState } from '../messages';

interface Props {
    source: string;
    playing: boolean;
    onPlay?: () => void;
    onPause?: () => void;
    onSeek?: (newTime: number) => void;
    onTimeInterval?: (time: number, playerState: PlayerState) => void;
}

interface State {
    playing: boolean;
    volume: number;
    fullscreen: boolean;
    currentTime: number;
    duration: number;
    showControls: boolean;
}

// const HIDE_CONTROLS_TIMEOUT = Config.createRoomEndpoint;
// const INTERVAL_TIME = Config.

function toMovieTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / (60 * 60))
    const minutes = Math.floor((totalSeconds / 60) - (hours * 60));
    const seconds = Math.floor(totalSeconds - (hours * 60 * 60) - (minutes * 60));
    return `${hours.toString(10).padStart(2, '0')}:${minutes.toString(10).padStart(2, '0')}:${seconds.toString(10).padStart(2, '0')}`;
}

class VideoPlayer extends React.Component<Props, State> {

    videoRef: React.RefObject<HTMLVideoElement>;
    figureRef: React.RefObject<any>;
    hideControlsTimeout: number | undefined;
    lastVolume: number;
    mouseOverControls: boolean;

    constructor(props: Props) {
        super(props);
        this.videoRef = React.createRef();
        this.figureRef = React.createRef();
        this.lastVolume = 1.0;
        this.hideControlsTimeout = undefined;
        this.mouseOverControls = false;
        this.state = {
            playing: props.playing,
            volume: 1.0,
            fullscreen: false,
            currentTime: 0,
            duration: 0,
            showControls: true,
        };
    }


    // Try to play the video. If something goes wrong, mute the auto and try again.
    // This is needed because autoplay with audio is disabled on some browsers.
    playVideo() {
        const video = this.videoRef.current;
        if (video) {
            const promise = video.play();

            if (promise !== undefined) {
                promise.then(() => {
                    // Autoplay started!
                }).catch(() => {
                    // Show an Error here.


                    // Show something in the UI that the video is muted
                    // this.setVolume(0);
                    // video.play();
                });
            }
        }
    }

    getPlayerState() : PlayerState {
        const video = this.videoRef.current;
        if (video) {
            if (video.readyState < 4) {
                return PlayerState.Loading;
            } else if (video.paused) {
                return PlayerState.Paused;
            } else {
                return PlayerState.Playing;
            }
        }
        return PlayerState.Paused;
    }

    onPlayClicked() {
        // If a handler was supplied then use it.
        // Otherwise just call the play function on the HTMLVideo ref
        if (this.props.onPlay !== undefined) {
            this.props.onPlay();
        } else {
            this.playVideo();
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

    togglePlayback() {
        if (this.state.playing) {
            this.onPauseClicked();
        } else {
            this.onPlayClicked();
        }
    }


    getPlayPauseButton() {
        const playing = this.state.playing;
        const btn_conf = {
            alt: playing ? 'Pause': 'Play',
            src: playing ? PauseIcon : PlayIcon,
        };

        return (
            <button id="playpause" onClick={() => {playing ? this.onPauseClicked() : this.onPlayClicked()}}>
                <img alt={btn_conf.alt} src={btn_conf.src}/>
            </button>
        );
    }

    getVolumeButton() {
        const muted = this.videoRef.current && this.videoRef.current.volume === 0;
        const vol = muted ? this.lastVolume : 0;
        const icon = muted ? VolumeMutedIcon : VolumeIcon;

        return (
            <button onClick={() => this.setVolume(vol)}>
                <img src={icon} alt="unmute" />
            </button>
        );
    }

    getFullscreenButton() {
        const fullscreen = this.state.fullscreen;
        const icon = fullscreen ? ExitFullScreenIcon : FullScreenIcon;
        const alt = fullscreen ? "Exit Fullsceen" : "Enter Fullscreen";

        return (
            <button id="fullscreen">
                <img
                    src={icon}
                    alt={alt}
                    onClick={() => this.handleFullscreen()}
                />
            </button>
        );
    }

    getControls() {
        return (
            <div
                className="controls"
                onMouseEnter={ () => this.mouseOverControls = true }
                onMouseLeave={ () => this.mouseOverControls = false }
            >
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
                    {this.getFullscreenButton()}
                </div>
            </div>
        );
    }

    hideControlsInFullscreen() {
        if (this.state.fullscreen) {
            // If a timeout is already set, clear it
            if (this.hideControlsTimeout !== undefined) {
                clearTimeout(this.hideControlsTimeout);
                this.hideControlsTimeout= undefined;
                this.setState({showControls: true});
            }

            // Create a timeout to hide the controls
            // The timout is cancelled if this funtion is called again
            if (!this.mouseOverControls && this.state.playing) {
                this.hideControlsTimeout = window.setTimeout(() => {
                    console.debug("timeout called, hiding controls");
                    this.setState({showControls: false});
                    this.hideControlsTimeout = undefined;
                }, Config.hide_controls_timeout);
            }
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
        if (video) {
            if (progress >= 0 && progress <= 1) {
                const newTime = video.duration * progress;
                if (this.props.onSeek) {
                    this.props.onSeek(newTime);
                } else {
                    video.currentTime = newTime;
                }
            }
        }
    }

    /* Enter or exit fullscreen */
    handleFullscreen() {
        if (this.state.fullscreen) {
            if (document.exitFullscreen) {
                clearTimeout(this.hideControlsTimeout);
                this.hideControlsTimeout = undefined;
                document.exitFullscreen();
                this.setState({ fullscreen: false, showControls: true });
            }
        }
        else {
            if (this.figureRef.current) {
                this.figureRef.current.requestFullscreen()
                this.setState({ fullscreen: true, showControls: true });
                this.hideControlsInFullscreen();
            }
        }
    }


    /* When the component is mounted add all of the listeners to the video and figure elements */
    componentDidMount() {
        const videoElem = this.videoRef.current;
        if (videoElem !== null) {
            videoElem.addEventListener('play', () => this.setState({ playing: true }));
            videoElem.addEventListener('pause', () => this.setState({ playing: false }));
            videoElem.addEventListener('volumechange', () => this.setState({ volume: videoElem.volume }));
            videoElem.addEventListener('loadedmetadata', () => this.setState({ duration: videoElem.duration }));
            videoElem.addEventListener('timeupdate', () => {
                this.setState({ currentTime: videoElem.currentTime })
            });

            if (this.state.playing) {
                videoElem.play();
            } else {
                videoElem.pause();
            }

            // Setup the time interval function
            if (this.props.onTimeInterval) {
                window.setInterval(() => {
                    this.props.onTimeInterval!(videoElem.currentTime, this.getPlayerState());
                }, Config.stats_update_interval);
            }
        }

        /* IT's actually the figure element that goes fullscreen, not the video */
        const figElem = this.figureRef.current;
        if (figElem !== null) {
            figElem.addEventListener('fullscreenchange', () => this.setState({ fullscreen: document.fullscreenElement !== null }));
        }
    }

    // Check if the props have updated. If the playing prop has changed then act accordingly
    componentDidUpdate(prevProps: Props) {
        if (this.props.playing !== prevProps.playing) {
            const videoElem = this.videoRef.current;
            if (videoElem !== null) {
                if (this.props.playing) {
                    this.playVideo();
                } else {
                    videoElem.pause();
                }
            }
        }
    }


    render() {
        let fullscreen_class = this.state.fullscreen ? "video-container-fullscreen" : ""
        const controls = this.state.showControls ? this.getControls() : null;

        const mouseEnter = () => {
            if (!this.state.fullscreen) this.setState({showControls: true});
        }

        const mouseLeave = () => {
            if (!this.state.fullscreen && this.state.playing) this.setState({showControls: false});
        }

        return (
            <div className={`video-container ${fullscreen_class}`}>
                <figure ref={this.figureRef} >
                    <div
                        className="video-and-controls"
                        onMouseMove={(e) => { this.hideControlsInFullscreen() }}
                        onMouseEnter={() => { mouseEnter() }}
                        onMouseLeave={() => { mouseLeave() }} >
                        <video
                            ref={this.videoRef}
                            preload="metadata"
                            onClick={() => this.togglePlayback()} >
                            <source src={this.props.source} type="video/mp4" />
                            Your browser does not support HTML video.
                        </video>
                        {controls}
                    </div>
                </figure>
            </div>
        );
    }
}

export default VideoPlayer;