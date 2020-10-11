import React from 'react';
import { PlayerState } from '../messages';
import User from '../user';
import {toMovieTime} from '../utils';

import './UsersTable.css';
import smallPlayIcon from '../icons/small_play_icon.svg';
import smallPauseIcon from '../icons/small_pause_icon.svg';

interface Props {
    users: User[],
}

const UsersTable = (props: Props) => {
    const miniSpinner = (
        <div className="mini-spinner"></div>
    );

    const tableRows = props.users.map((user: User) => {
        let iconData;
        if (user.state === PlayerState.Playing) {
            iconData = <td><img alt="play" src={smallPlayIcon}/></td>;
        } else if (user.state === PlayerState.Paused) {
            iconData = <td><img alt="pause" src={smallPauseIcon}/></td>;
        } else {
            iconData = <td>{miniSpinner}</td>;
        }

        let nameData;
        if (user.director) {
            nameData = <td><u><b>{user.name}</b></u></td>;
        } else {
            nameData = <td>{user.name}</td>
        }

        const timeData = <td>{toMovieTime(user.time)}</td>

        return (
            <tr key={user.id}>
                {iconData}
                {nameData}
                {timeData}
            </tr>
        );
    })

    return (
        <div className="UsersTable">
            <span>Users connected to this party</span>
            <hr/>
            <table>
                <tbody>
                    {tableRows}
                </tbody>
            </table>
        </div>

    );
}

export default UsersTable;