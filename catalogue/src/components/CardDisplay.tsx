import React from 'react';
import {motion} from 'framer-motion';
import Card from './Card';
import Movie from '../models/Movie';
import TvShow from '../models/TvShow';
import './CardDisplay.css';

type CardItem = Movie|TvShow;

interface Props {
    cardSelectedCallback: (c: CardItem) => void;
    cards: CardItem[];
}

const CardDisplay = (props: Props) => {

    const container = {
        hidden: {},
        show: {
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3,
            },
        },
    }

    const cards = props.cards.map(card => {
        let idPrefix: String = "";
        if (card instanceof Movie) {
            idPrefix = "movie";
        } else if (card instanceof TvShow) {
            idPrefix = "tvshow"
        }
        const id = `${idPrefix}${card?.id}`;

        return (
            <Card
                key={id}
                item={card}
                cardClickedCallback={(c) => props.cardSelectedCallback(c)}
            />
        );
    });

    return (
        <motion.div className="CardDisplay" variants={container} initial="hidden" animate="show">
            {cards}
        </motion.div>
    );
}

export default CardDisplay