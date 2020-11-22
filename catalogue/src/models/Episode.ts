
class Episode {
    id: number;
    url: string;
    title: string;
    num: number;

    constructor(id: number, url: string, title: string, num: number) {
        this.id = id;
        this.url = url;
        this.title = title;
        this.num = num;
    }

    static fromJson(j: any): Episode|null {
        if (typeof j === 'object'
            && 'id' in j
            && 'url' in j
            && 'title' in j
            && 'num' in j
        ) {
            return new Episode( j['id'], j['url'], j['title'], j['num']);
        }
        console.error(`Could not deserialise ${JSON.stringify(j)} into Episode`);
        return null;
    }
}

export default Episode;