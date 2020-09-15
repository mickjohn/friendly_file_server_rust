import React from 'react';

interface Props {
    max: number,
    value: number,
    progressBarClass?: string,
    onClick?: (p: number) => void;
}

class ProgressBar extends React.Component<Props> {

    progressRef: React.RefObject<HTMLProgressElement>;

    constructor(props: Props) {
        super(props);
        this.progressRef = React.createRef();
    }

    onProgressClick = (event: React.MouseEvent<HTMLProgressElement, MouseEvent>) => {
        if (this.progressRef.current !== null && this.props.onClick !== undefined) {
            const elem = this.progressRef.current;
            const posistionX = elem.getBoundingClientRect().x;
            const width = elem.clientWidth;
            const clickLocation = event.clientX - posistionX;
            const percentage = (clickLocation / width);
            this.props.onClick(percentage);
        }
    }

    render() {
        const classNames: string = this.props.progressBarClass === undefined ? 'progress-bar' : this.props.progressBarClass;
        return (
            <div className={classNames}>
                <progress
                    ref={this.progressRef}
                    max={this.props.max}
                    value={this.props.value}
                    onMouseDownCapture={(e) => { this.onProgressClick(e)}}
                    onMouseMoveCapture={(e) => {
                        if (e.buttons === 1) {
                            this.onProgressClick(e);
                        }
                    }}
                >
                </progress>
            </div>

        );
    }
}

export default ProgressBar;