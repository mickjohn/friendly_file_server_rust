import React from 'react';
import './Spinner.css';

interface Props {
    message?: string;
};

const Spinner = (props: Props) => {
    return (
        <div className="Spinner-container">
            <div className="Spinner"></div>
            <p className="Spinner-message">{props.message}</p>
        </div>
    );
}

export default Spinner;