import Episode from "./Episode";

class Season {
    title: string;
    episodes: Episode[];

    constructor(title: string, episodes: Episode[]) {
        this.title = title;
        this.episodes = episodes;
    }

    static fromJson(j: any): Season|null {
        if (
            typeof j === 'object'
            && 'title' in j
            && 'episodes' in j
        ) {
            const title = j['title'];
            const episodes = j['episodes'];
            if (typeof title === 'string' && typeof episodes === 'object' ) {
                const parsed_eps = episodes.map((ep: any) => {
                    return Episode.fromJson(ep);
                });
                return new Season(title, parsed_eps);
            }
        }
        console.error(`Could not deserialise ${j} into Season`);
        return null;
    }
}

export default Season;