
class User {
    id: number;
    name: string;
    state: string;
    time: number;
    director: boolean;

    constructor(
        id: number,
        name: string,
        state: string,
        time: number,
        director: boolean,
    ) {
        this.id = id;
        this.name = name;
        this.state = state;
        this.time = time;
        this.director = director;
    }
}

export function findDirector(users: User[]): User | undefined {
    for (const user of users) {
        if (user.director) return user;
    }
    return undefined;
}

export default User;