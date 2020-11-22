import React from 'react';

interface Props {
    items: string[];
    selected: string;
    onSelected: (i: number) => void;
}

const Dropdown = (props: Props) => {

    const options = props.items.map(i => <option key={i}>{i}</option>);

    const getIndex = (event: React.ChangeEvent<HTMLSelectElement>): number => {
        const item = event.target.value;
        return props.items.indexOf(item);
    }

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        props.onSelected(getIndex(event));
        event.preventDefault();
    }

    return (
        <select value={props.selected} onChange={handleChange}>
            {options}
        </select>
    );
}

export default Dropdown;