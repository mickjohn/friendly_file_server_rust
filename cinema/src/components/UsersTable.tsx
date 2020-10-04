import React, { Fragment } from 'react';
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
            iconData = <td><img src={smallPlayIcon}/></td>;
        } else if (user.state === PlayerState.Paused) {
            iconData = <td><img src={smallPauseIcon}/></td>;
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
            <tr>
                {iconData}
                {nameData}
                {timeData}
            </tr>
        );
    })

    return (
        <div className="UsersTable">
            <h5>The Party</h5>
            {/* <ul>
                {listItems}
            </ul> */}
            <table>
                {tableRows}
            </table>
        </div>

    );
}

export default UsersTable;