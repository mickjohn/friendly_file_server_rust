import React, { useState } from 'react';
import Dropdown from './Dropdown';
import Season from '../models/Season';
import TvShow from '../models/TvShow';
import Episode from '../models/Episode';
import './TvShowInfo.css';

interface Props {
    tvshow: TvShow;
}

const noSeasonsMessage = () => {
    return <div>No Seasons available</div>;
}

const getEpisodes = (episodes: Episode[]) => {
    const rows = episodes.map(e => {
        return (<tr key={e.id}>
            <td>{e.num}</td>
            <td><a href={e.url}>{e.title}</a></td>
        </tr>);
    });

    return (
        <table>
            <tbody>
                {rows}
            </tbody>
        </table>
    );
}

const CardInfo = (props: Props) => {
    const [selectedSeason, setSelectedSeason] = useState<Season|undefined>(props.tvshow.seasons[0]);
    const seasonNames = props.tvshow.seasons.map(s => s.title);

    if (selectedSeason === undefined) {
        return noSeasonsMessage();
    }

    const getDropdown = () => {
        return <Dropdown
            items={seasonNames}
            selected={selectedSeason.title}
            onSelected={(i: number) => {
                const s = props.tvshow.seasons[i];
                setSelectedSeason(s);
            }} />;
    }

    return (
        <div className="TvShowInfo">
            <h1>{props.tvshow.getHeader()}</h1>
            <h4>{props.tvshow.getSubheader()}</h4>
            <p>{props.tvshow.getDescription()}</p>
            <hr/>
            {getDropdown()}
            {getEpisodes(selectedSeason.episodes)}
        </div>
    );
}

export default CardInfo;