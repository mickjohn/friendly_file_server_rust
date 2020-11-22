import ICardItem from './CardItem';
import Season from './Season';

class TvShow implements ICardItem {
    id: number;
    title: string;
    description: string;
    seasons: Season[];

    constructor(id: number, title: string, description: string, seasons: Season[]) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.seasons = seasons;
    }

    static fromJson(j: any): TvShow | null {
        if (
            typeof j === 'object'
            && 'id' in j
            && 'title' in j
            && 'seasons' in j
            && 'description' in j
        ) {
            const id = j['id'];
            const title = j['title'];
            const seasons = j['seasons'];
            const description = j['description'];

            if (typeof title === 'string' && typeof description === 'string' && typeof seasons === 'object') {
                const parsed_seasons = seasons.map((ep: any) => {
                    return Season.fromJson(ep);
                });
                return new TvShow(id, title, description, parsed_seasons);
            }
        }
        console.error(`Could not deserialise ${j} into TvShow`);
        return null;
    }

    numberOfSeasons(): number {
        return this.seasons.length;
    }

    numberOfEpisodes(): number {
        let acc = 0;
        this.seasons.forEach((s: Season) => acc += s.episodes.length);
        return acc;
    }

    getHeader(): string { return this.title }

    getSubheader(): string {
        const numSeasons = this.numberOfSeasons();
        const numEpisodes = this.numberOfEpisodes();
        const seasonSuffix = numSeasons === 1 ? '' : 's';
        const episodeSuffix = numEpisodes === 1 ? '' : 's';
        return `${numSeasons} season${seasonSuffix} | ${numEpisodes} episode${episodeSuffix}`;
    }

    getDescription(): string { return this.description }
}

export default TvShow;