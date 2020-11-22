import React from 'react';
import { motion } from 'framer-motion';

import Movie from '../models/Movie';
import TvShow from '../models/TvShow';
import './Card.css';

type CardItem = Movie|TvShow;

interface Props {
    cardClickedCallback: (c: CardItem) => void;
    item: CardItem;
}

const Card = (props: Props) => {

    const animationVarients = {
        hidden: { scale: 0 },
        show: { scale: 1 },
    }

    return (
        <motion.div
            className="Card"
            whileHover={{ scale: 1.03 }}
            variants={animationVarients}
            onClick={() => props.cardClickedCallback(props.item)}
        >

            <div className="CardHeader">{props.item.getHeader()}</div>
            <div className="CardYear">{props.item.getSubheader()}</div>
            <div className="CardDescription">{props.item.getDescription()}</div>
        </motion.div>
    );
}

export default Card;