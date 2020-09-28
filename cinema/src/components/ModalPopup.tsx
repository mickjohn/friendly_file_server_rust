import React from 'react';

import './ModalPopup.css';

interface Props {
    show: boolean;
    children: React.ReactNode;
    onClose: () => void;
}

const ModalPopup = (props: Props) => {
    if (!props.show) return null;

    return (
        <div className="modal-popup" onClick={props.onClose}>
            <div className="modal-popup-content" onClick={(e) => e.stopPropagation()}>
                {props.children}
            </div>
        </div>
    );
}

export default ModalPopup;