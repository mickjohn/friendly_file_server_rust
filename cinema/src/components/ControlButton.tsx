import React from 'react';
import { motion } from 'framer-motion';

import './ControlButton.css';
import PlayIcon from '../icons/play_icon.svg';
import PauseIcon from '../icons/pause_icon.svg';
import FullScreenIcon from '../icons/fullscreen.svg';
import ExitFullScreenIcon from '../icons/exit_fullscreen.svg';
import VolumeMutedIcon from '../icons/volume_muted.svg';
import VolumeIcon from '../icons/volume_icon.svg';


interface Props {
    type: "play" | "pause" | "fullscreen" | "exitfullscreen" | "volume" | "mutevolume";
    onClick: () => void;
}

interface BtnConfig {
    play: {alt: string, src: string},
    pause: {alt: string, src: string},
    fullscreen: {alt: string, src: string},
    exitfullscreen: {alt: string, src: string},
    volume: {alt: string, src: string},
    mutevolume: {alt: string, src: string},
}

const btnConfig: BtnConfig = {
    play: {
        alt: 'Play',
        src: PlayIcon,
    },
    pause: {
        alt: 'Pause',
        src: PauseIcon,
    },
    fullscreen: {
        alt: 'Fullscreen',
        src: FullScreenIcon,
    },
    exitfullscreen: {
        alt: 'Exit Fullscreen',
        src: ExitFullScreenIcon,
    },
    volume: {
        alt: 'Unmute',
        src: VolumeMutedIcon,
    },
    mutevolume: {
        alt: 'Mute',
        src: VolumeIcon,
    },
}

const ControlButton = (props: Props) => {
    const conf = btnConfig[props.type];
    return (
        <motion.button className="ControlButton" onClick={props.onClick} whileHover={{ scale: 1.2 }} >
            <img alt={conf.alt} src={conf.src} />
        </motion.button>
    );
}

export default ControlButton;