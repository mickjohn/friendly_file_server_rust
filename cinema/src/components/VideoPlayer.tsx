import React from 'react';
import Config from '../config';
import ProgressBar from './ProgressBar';

// Resources
import './VideoPlayer.css';
import ControlButton from './ControlButton';
import ShowSidebar from '../icons/watch_with_friends.svg';
import PlayerState from '../playerstate';
import {UrlExists} from '../utils';
import { threadId } from 'worker_threads';

interface Props {
    source: string;
    playing: boolean;
    currentTime: number;
    adjustTime: number;
    showPartyButton: boolean;
    partyButtonOnClick: () => void;

    // If set, call this instead starting playback
    onPlay?: () => void;

    // If set, call this instead of pausing
    onPause?: () => void;

    // If set, call this instead of setting the current time
    onSeek?: (newTime: number) => void;

    // If set, call this on the interval that used to pass updated to parent component
    onTimeInterval?: (time: number, playerState: PlayerState) => void;

    // Call this with the video player ontimeupdate event handler. Used to update the
    // current time in the parent component.
    setCurrentTimeCallback?: (time: number) => void;
}

interface State {
    playing: boolean;
    volume: number;
    fullscreen: boolean;
    duration: number;
    showControls: boolean;
    haveSubtitles: boolean;
    showSubtitles: boolean;
}

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
    statsUpdateInterval: number;
    saveCurrentTimeInterval: number;
    filename: string;

    constructor(props: Props) {
        super(props);
        this.videoRef = React.createRef();
        this.figureRef = React.createRef();
        this.lastVolume = 1.0;
        this.hideControlsTimeout = undefined;
        this.mouseOverControls = false;
        this.statsUpdateInterval = -1;
        this.saveCurrentTimeInterval = -1;
        const filenameParts = this.props.source.split('/');
        this.filename = filenameParts[filenameParts.length - 1];

        this.state = {
            playing: props.playing,
            volume: 1.0,
            fullscreen: false,
            duration: 0,
            showControls: true,
            haveSubtitles: false,
            showSubtitles: false,
        };
    }

    saveCurrentTimeToStorage() {
        const data = {
            source: this.props.source,
            currentTime: this.props.currentTime,
        };
        const dataString = JSON.stringify(data);
        const key = Config.localStorageKeys.currentTime;
        window.localStorage.setItem(key, dataString);
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

        // Begin the hide-controls timeout
        this.hideControlsInFullscreen();

        // If a handler was supplied then use it.
        // Otherwise just call the play function on the HTMLVideo ref
        if (this.props.onPlay !== undefined) {
            this.props.onPlay();
        } else {
            this.playVideo();
        }
    }

    onPauseClicked() {
        // Show the controls when video is paused
        this.setState({showControls: true});

        // Remove the hideControlsTimout when the video is paused
        if (this.hideControlsTimeout !== undefined) {
            clearTimeout(this.hideControlsTimeout)
        }

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

    hideSubtitles() {
        this.setState({ showSubtitles: false });
        if (this.videoRef.current) {
            for (var i = 0; i < this.videoRef.current.textTracks.length; i++) {
                this.videoRef.current.textTracks[i].mode = 'hidden';
            }
        }
    }

    showSubtitles() {
        this.setState({ showSubtitles: true });
        if (this.videoRef.current) {
            for (var i = 0; i < this.videoRef.current.textTracks.length; i++) {
                this.videoRef.current.textTracks[i].mode = 'showing';
            }
        }
    }

    getPlayPauseButton() {
        if (this.state.playing) {
            return <ControlButton type='pause' onClick={() => this.onPauseClicked() } />;
        } else {
            return <ControlButton type='play' onClick={() => this.onPlayClicked() } />;
        }
    }

    getSubtitlesButton() {
        if (this.state.haveSubtitles) {
            if (this.state.showSubtitles) {
                return <ControlButton type='hidesubs' onClick={() => this.hideSubtitles()} />;
            } else {
                return <ControlButton type='showsubs' onClick={() => this.showSubtitles()} />;
            }
        }
        return null;
    }

    getVolumeButton() {
        const muted = this.videoRef.current && this.videoRef.current.volume === 0;
        const volumeType = muted ? 'volume' : 'mutevolume';
        const vol = muted ? this.lastVolume : 0;
        return <ControlButton type={volumeType} onClick={() => this.setVolume(vol)}/>;
    }

    getFullscreenButton() {
        const fullscreenType = this.state.fullscreen ? 'exitfullscreen' : 'fullscreen';
        return <ControlButton type={fullscreenType} onClick={() => this.handleFullscreen()}/>;
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
                    value={this.props.currentTime}
                    onClick={(p) => {
                        this.setCurrentTime(p);
                    }}
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
                    {this.getSubtitlesButton()}
                    <span>{toMovieTime(this.props.currentTime)} / {toMovieTime(this.state.duration)}</span>
                    {this.getFullscreenButton()}
                </div>
            </div>
        );
    }

    // Show the controls and then hide them after some time has elapsed.
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
            if (this.state.playing) {
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
        } else {
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
                if (this.props.setCurrentTimeCallback) {
                    this.props.setCurrentTimeCallback(videoElem.currentTime);
                }
            });
            videoElem.currentTime = this.props.currentTime;


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

            this.saveCurrentTimeInterval = window.setInterval(() => this.saveCurrentTimeToStorage(), 3000);
        }

        /* It's actually the figure element that goes fullscreen, not the video */
        const figElem = this.figureRef.current;
        if (figElem !== null) {
            figElem.addEventListener('fullscreenchange', () => this.setState({ fullscreen: document.fullscreenElement !== null }));
        }

        /* Check if the subtitles exist */
        const subtitlesUrl = this.props.source.replace(/\.mp4$/, '.vtt');
        UrlExists(subtitlesUrl, (exists: boolean) => {
            console.info(`Checking for subtitles file at ${subtitlesUrl}`)
            if (exists) {
                this.setState({ haveSubtitles: true })
                console.info("Subtitles file found");
            } else {
                console.error("Subtitles file not found");
            }
            this.hideSubtitles();
        });
    }

    // Check if the props have updated. If the playing prop has changed then act accordingly
    componentDidUpdate(prevProps: Props) {
        const videoElem = this.videoRef.current;
        if (this.props.playing !== prevProps.playing) {
            if (videoElem) {
                if (this.props.playing) {
                    this.playVideo();
                } else {
                    videoElem.pause();
                }
            }
        }

        // Updating the current time from props.currentTime causes stuttering.
        // This adjustTime prop is changed when the Parent component wants to
        // tell this component that it should update set the video's current
        // time to props.currentTime
        if (this.props.adjustTime !== prevProps.adjustTime) {
            if (videoElem) videoElem.currentTime = this.props.currentTime;
        }

        if (this.props.onTimeInterval===undefined) {
            window.clearInterval(this.statsUpdateInterval);
        }

        // Setup the time interval function
        if (this.props.onTimeInterval !== undefined && prevProps.onTimeInterval === undefined && videoElem) {
            this.statsUpdateInterval = window.setInterval(() => {
                this.props.onTimeInterval!(videoElem.currentTime, this.getPlayerState());
            }, Config.stats_update_interval);
        }
    }

    componentWillUnmount() {
        window.clearInterval(this.statsUpdateInterval);
        window.clearInterval(this.saveCurrentTimeInterval);
        window.clearTimeout(this.hideControlsTimeout);
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

        let track = null;
        if (this.state.haveSubtitles) {
            track = <track label="English" kind="subtitles" srcLang="en" src={this.props.source.replace(/\.mp4$/, '.vtt')} default />
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
                            onClick={() => this.togglePlayback() } >
                            <source src={this.props.source} type="video/mp4" />
                            {track}
                            Your browser does not support HTML video.
                        </video>
                        {controls}
                    </div>
                </figure>
                <div className="video-bottom-info">
                    <h3>{ this.filename }</h3>
                    {this.props.showPartyButton && <button onClick={() => this.props.partyButtonOnClick()}><img alt="watch with friends" src={ShowSidebar}/></button>}
                </div>
            </div>
        );
    }
}

export default VideoPlayer;