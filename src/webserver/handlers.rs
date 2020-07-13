use super::models::{Hba, Sp, Rooms, Room, Urls, UrlQuery};
use super::filters::Authenticated;
use std::collections::HashMap;
use std::path::PathBuf;
use warp::path::FullPath;
use warp::http::Uri;
use url::form_urlencoded::parse;
use rand::Rng;
use base64::decode;

const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ROOM_CODE_LEN: usize = 4;

pub fn decode_url(fp: &FullPath) -> String {
    parse(fp.as_str().as_bytes())
        .map(|(key, val)| [key, val].concat())
        .collect()
}

pub async fn render_index<'a>(_: Authenticated, sp: Sp, hba: Hba<'a>, fp: warp::path::FullPath) -> Result<impl warp::Reply, warp::Rejection> {
    let path_str = decode_url(&fp).replace("/browse/", "").replace("/", "\\");
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

    let mut data = HashMap::new();
    data.insert("mp4_path", path_str);

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

pub async fn create_room(_: Authenticated, rooms: Rooms, urls: Urls, b64url: UrlQuery) -> Result<impl warp::Reply, warp::Rejection> {
    info!("Create room called");
    use std::str::from_utf8;
    let mut code;
    let decoded = decode(b64url.url.as_bytes()).map_err(|_| warp::reject())?;
    let url = from_utf8(decoded.as_slice()).map_err(|_| warp::reject())?;

    let mut rooms = rooms.lock().await;
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

    let mut resp_map = HashMap::new();
    resp_map.insert("room", code);
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