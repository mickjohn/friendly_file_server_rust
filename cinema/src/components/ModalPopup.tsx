import React from 'react';

import './ModalPopup.css';

interface Props {
    show: boolean;
    children: React.ReactNode;
    onClose: () => void;
    classNamePrefix?: string;
}

const ModalPopup = (props: Props) => {
    if (!props.show) return null;
    const prefix = props.classNamePrefix ?? '';

    return (
        <div className={prefix + "modal-popup"} onClick={props.onClose}>
            <div className={prefix + "modal-popup-content"} onClick={(e) => e.stopPropagation()}>
                {props.children}
            </div>
        </div>
    );
}

export default ModalPopup;