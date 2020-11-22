import React, { Fragment, useEffect, useState } from 'react';
import Movie from '../models/Movie';
import TvShow from '../models/TvShow';
import './App.css';
import CardDisplay from './CardDisplay';
import ModalPopup from './ModalPopup';
import TvShowInfo from './TvShowInfo';
import MovieInfo from './MovieInfo';

type CardItem = Movie | TvShow;

const displayCard = (card: CardItem) => {
  if (card instanceof Movie) {
    return <MovieInfo movie={card} />;
  } else if (card instanceof TvShow) {
    return <TvShowInfo tvshow={card} />;
  }
  return null;
}

// const errorMessage = (
//   <div className="AppErrorMessage">
//     <p>
//       Something went wrong!
//     </p>
//   </div>
// );

function App() {
  const [showModal, setShowModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [catalogueItems, setCatalogueItems] = useState<(Movie|TvShow)[]>([]);

  useEffect(() => {
    console.log("Making request...");
    fetch("/api/catalogue")
      .then(res => res.json())
      .then(
        (result) => {
          const tvshows: TvShow[] = result.tvshows
            .map((item: any) => TvShow.fromJson(item))
            .filter((item: (null | TvShow)) => { return item !== null }) as TvShow[];
          const movies: Movie[] = result.movies
            .map((item: any) => Movie.fromJson(item))
            .filter((item: (null | Movie)) => { return item !== null }) as Movie[];
          let catalogue: (Movie | TvShow)[] = movies;
          catalogue =catalogue.concat(tvshows);
          setCatalogueItems(catalogue);
        },
        (error) => {
          console.error("Error making fetch request");
        }
      )
  }, []);

  return (
    <Fragment>
      <header>
        <a href="/browse/"><h2>Mickjohn.com</h2></a>
      </header>

      <div className="App">
        <h1>Movies & TV Shows</h1>
        <CardDisplay
          cards={catalogueItems}
          cardSelectedCallback={(c: Movie | TvShow) => {
            setShowModal(true);
            setSelectedCard(c);
          }}
        />
      </div>
      {showModal &&
        <ModalPopup
          onClose={() => {
            setShowModal(false);
            setSelectedCard(null);
          }}
        >
          {selectedCard && displayCard(selectedCard)}
        </ModalPopup>
      }
    </Fragment>
  );
}

export default App;
