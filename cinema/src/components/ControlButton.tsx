import React from 'react';
import { motion } from 'framer-motion';

import './ControlButton.css';
import PlayIcon from '../icons/play_icon.svg';
import PauseIcon from '../icons/pause_icon.svg';
import FullScreenIcon from '../icons/fullscreen.svg';
import ExitFullScreenIcon from '../icons/exit_fullscreen.svg';
import VolumeMutedIcon from '../icons/volume_muted.svg';
import VolumeIcon from '../icons/volume_icon.svg';
import ShowSubs from '../icons/show_subs.svg';
import HideSubs from '../icons/hide_subs.svg';


interface Props {
    type: "play"
        | "playdisabled"
        | "pause"
        | "pausedisabled"
        | "fullscreen"
        | "exitfullscreen"
        | "volume"
        | "mutevolume"
        | "showsubs"
        | "hidesubs";
    onClick: () => void;
}

interface BtnProps {
    alt: string,
    src: string
}

interface BtnConfig {
    play: BtnProps,
    playdisabled: BtnProps,
    pause: BtnProps,
    pausedisabled: BtnProps,
    fullscreen: BtnProps,
    exitfullscreen: BtnProps,
    volume: BtnProps,
    mutevolume: BtnProps,
    showsubs: BtnProps,
    hidesubs: BtnProps,
}

const btnConfig: BtnConfig = {
    play: { alt: 'Play', src: PlayIcon, },
    playdisabled: { 'alt': "Can't Play", src: PlayIcon },
    pause: { alt: 'Pause', src: PauseIcon, },
    pausedisabled: {alt: "Can't Pause", src: PauseIcon},
    fullscreen: { alt: 'Fullscreen', src: FullScreenIcon, },
    exitfullscreen: { alt: 'Exit Fullscreen', src: ExitFullScreenIcon, },
    volume: { alt: 'Unmute', src: VolumeMutedIcon, },
    mutevolume: { alt: 'Mute', src: VolumeIcon, },
    showsubs: { alt: 'Show Captions', src: ShowSubs },
    hidesubs: { alt: 'Hide Captions', src: HideSubs },
}

const ControlButton = (props: Props) => {
    const conf = btnConfig[props.type];
    return (
        <motion.button className="ControlButton" onClick={props.onClick} >
            <img alt={conf.alt} src={conf.src} />
        </motion.button>
    );
}

export default ControlButton;