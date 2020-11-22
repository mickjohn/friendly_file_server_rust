import ICardItem from "./CardItem";

class Movie implements ICardItem {
    id: number;
    url: string;
    title: string;
    description: string;
    year?: number;

    constructor(
        id: number,
        url: string,
        title: string,
        description: string,
        year?: number,
    ) {
        this.id = id;
        this.url = url;
        this.title = title;
        this.description = description;
        this.year = year;
    }

    static fromJson(j: any): Movie | null {
        if (typeof j === 'object'
            && 'id' in j
            && 'url' in j
            && 'title' in j
            && 'description' in j
        ) {
            return new Movie(
                j['id'],
                j['url'],
                j['title'],
                j['description'],
                j['year'] ?? undefined,
            )
        }
        console.error(`Could not deserialise ${JSON.stringify(j)} into Movie`);
        return null;
    }

    getHeader(): string { return this.title }
    getSubheader(): string {return this.year?.toString() ?? '-'}
    getDescription(): string { return this.description }
}

export default Movie;