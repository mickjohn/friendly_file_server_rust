import React from 'react';
import './Spinner.css';

interface Props {
    message?: string;
    display: boolean;
};

const Spinner = (props: Props) => {
    if (!props.display) return null;

    return (
        <div>
            <h1>Checking...</h1>
            <div className="Spinner"></div>
            <p className="Spinner-message">{props.message}</p>
        </div>
    );
}

export default Spinner;