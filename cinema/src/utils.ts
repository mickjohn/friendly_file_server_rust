

// function setUrlParams(params: Map<string, string>) {
//     let url = window.location.href;
//     url = url.replace(window.location.search, '');
//     let pairs: string[] = [];

//     params.forEach((value, key) => {
//         pairs.push(`${key}=${value}`);
//     });

//     if (pairs.length) {
//         const search = "?" + pairs.join("&");
//         url = url + search;
//         window.history.replaceState('', '', url);
//     }
// }

/*
Turn a float of seconds into a movie timestamp like "01:45:14" string
*/
export function toMovieTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / (60 * 60))
    const minutes = Math.floor((totalSeconds / 60) - (hours * 60));
    const seconds = Math.floor(totalSeconds - (hours * 60 * 60) - (minutes * 60));
    return `${hours.toString(10).padStart(2, '0')}:${minutes.toString(10).padStart(2, '0')}:${seconds.toString(10).padStart(2, '0')}`;
}



export default toMovieTime;