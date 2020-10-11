use std::collections::HashMap;
use std::path::PathBuf;
use warp::path::FullPath;
use warp::http::Uri;
use url::form_urlencoded::parse;
use rand::Rng;
use base64::decode;
use tokio::task;

use super::websocket::delete_from_rooms;
use super::models::{Hba, Sp, Rooms, Room, Urls, UrlQuery, RoomCodeQuery, RoomCleaner};
use super::filters::Authenticated;

const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ROOM_CODE_LEN: usize = 4;

pub fn decode_url(fp: &FullPath) -> String {
    parse(fp.as_str().as_bytes())
        .map(|(key, val)| [key, val].concat())
        .collect()
}

pub async fn render_index<'a>(_: Authenticated, sp: Sp, hba: Hba<'a>, fp: warp::path::FullPath) -> Result<impl warp::Reply, warp::Rejection> {
    let path_str = if cfg!(target_os = "windows") {
        decode_url(&fp).replace("/browse/", "").replace("/", "\\")
    } else {
        decode_url(&fp).replace("/browse/", "")
    };

    let path = PathBuf::from(&path_str);
    let sp = sp.lock().await;

    if sp.is_file(&path) {
        return Err(warp::reject())
    }

    let listing = sp.get_directory_listing(&path).unwrap();
    let mut data = HashMap::new();
    data.insert(String::from("listing"), listing);

    let render = hba.hba.lock().await
        .render("listing.html", &data)
        .unwrap_or_else(|err| err.to_string());
    Ok(warp::reply::html(render))
}


pub async fn render_cinema<'a>(_: Authenticated, sp: Sp, hba: Hba<'a>, fp: warp::path::FullPath) -> Result<impl warp::Reply, warp::Rejection> {
    let path_str = decode_url(&fp).replace("/cinema/", "/browse/");
    let path: PathBuf = path_str.replace("/browse/", "").split("/").collect();
    let sp = sp.lock().await;

    if !sp.is_file(&path) {
        error!("Rejecting, not a path... {:?}", path);
        return Err(warp::reject())
    }

    let file_name = path.file_name().unwrap().to_str().unwrap();

    let mut data = HashMap::new();
    data.insert("mp4_path", path_str.as_str());
    data.insert("mp4_name", file_name);

    let render = hba.hba.lock().await
        .render("cinema.html", &data)
        .unwrap_or_else(|err| err.to_string());
    Ok(warp::reply::html(render))
}

fn generate_room_code() -> String {
    let mut rng = rand::thread_rng();
    (0..ROOM_CODE_LEN)
        .map(|_| {
            let idx = rng.gen_range(0, CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

pub async fn create_room(_: Authenticated, rooms_arc: Rooms, cleaner: RoomCleaner, urls: Urls, b64url: UrlQuery) -> Result<impl warp::Reply, warp::Rejection> {
    use std::str::from_utf8;
    let mut code;
    let decoded = decode(b64url.url.as_bytes()).map_err(|_| warp::reject())?;
    let url = from_utf8(decoded.as_slice()).map_err(|_| warp::reject())?;

    // Extra scope to limit length of rooms and urls mutex lock
    {
        let mut rooms = rooms_arc.lock().await;
        let mut urls = urls.lock().await;

        loop {
            code = generate_room_code();
            if !rooms.contains_key(&code) {
                break;
            }
        }
        let url_with_query = format!("{}?cinema=1&room={}", url, code);
        let room = Room::new(code.clone());
        rooms.insert(code.clone(), room);
        urls.insert(code.clone(), url_with_query.to_owned());
    }

    let mut resp_map = HashMap::new();
    resp_map.insert("room", code.clone());

    // Start the task to delete the room, in case no one joins it.
    task::spawn(async {
        delete_from_rooms(rooms_arc, cleaner, code).await;//.await;
    });

    Ok(warp::reply::json(&resp_map))
}

pub async fn check_room(_: Authenticated, rooms: Rooms, room_code: RoomCodeQuery) -> Result<impl warp::Reply, warp::Rejection> {
    let mut resp_map = HashMap::new();
    let rooms = rooms.lock().await;
    if rooms.contains_key(&room_code.room) {
        resp_map.insert("exists", true);
    } else {
        resp_map.insert("exists", false);
    }
    Ok(warp::reply::json(&resp_map))
}

pub async fn wwf_lookup_redirect(
    _: Authenticated,
    code: String,
    urls: Urls
) -> Result<impl warp::Reply, warp::Rejection> {
    use std::str::FromStr;

    let urls = urls.lock().await;
    if let Some(url) = urls.get(&code) {
        let uri = Uri::from_str(url).unwrap();
        let redirect = warp::redirect(uri);
        Ok(redirect)
    } else {
        Err(warp::reject())
    }
}