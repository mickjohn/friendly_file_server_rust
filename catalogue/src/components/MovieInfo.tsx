import React from 'react';
import Movie from '../models/Movie';

interface Props {
    movie: Movie;
}

const MovieInfo = (props: Props) => {
    return (
        <div className="MovieInfo">
            <h1>{props.movie.getHeader()}</h1>
            <h4>{props.movie.getSubheader()}</h4>
            <p>{props.movie.getDescription()}</p>
            <a href={props.movie.url}>Watch now</a>
        </div>
    );
}

export default MovieInfo;