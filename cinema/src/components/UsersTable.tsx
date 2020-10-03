import React from 'react';
import User from '../user';
import {toMovieTime} from '../utils';

import './UsersTable.css';

interface Props {
    users: User[],
}

const UsersTable = (props: Props) => {
    const listItems = props.users.map((user: User) => {
        const director = user.director ? <i>director</i> : null;
        return <li key={user.id}>[{user.state}] {user.name} {director} {toMovieTime(user.time)}</li>
    });

    return (
        <div className="UsersTable">
            <h5>The Party</h5>
            <ul>
                {listItems}
            </ul>
        </div>

    );
}

export default UsersTable;