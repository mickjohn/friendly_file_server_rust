import React from 'react';

import './ModalPopup.css';

interface Props {
    children: React.ReactNode;
    onClose: () => void;
    extraClasses?: string;
}

const ModalPopup = (props: Props) => {
    const extraClasses = props.extraClasses === undefined ? '' : props.extraClasses;
    return (
        <div className="modal-popup" onClick={props.onClose}>
            <div className={`modal-popup-content ${extraClasses}`} onClick={(e) => e.stopPropagation()}>
                {props.children}
            </div>
        </div>
    );
}

export default ModalPopup;