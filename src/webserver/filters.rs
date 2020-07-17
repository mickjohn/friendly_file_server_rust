use crate::verify;
use super::handlers;
use super::rejections;
use super::models::{Sp, Hba, UserMap, Rooms, Urls, UrlQuery};

use warp::Filter;
use warp::http::StatusCode;
use base64;
use std::str;

#[derive(Clone)]
pub struct Authenticated;

pub fn render_file_listing<'a>(
    sp: Sp,
    hba: Hba<'a>,
    users: UserMap,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone + 'a {
    warp::path!("browse" / ..)
        .and(warp::get())
        .and(auth(users))
        .and(with_sp(sp))
        .and(with_hba(hba))
        .and(warp::path::full())
        .and_then(handlers::render_index)
}

pub fn render_cinema_page<'a>(
    sp: Sp,
    hba: Hba<'a>,
    users: UserMap,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone + 'a {
    warp::path!("cinema" / ..)
        .and(warp::get())
        .and(auth(users))
        .and(with_sp(sp))
        .and(with_hba(hba))
        .and(warp::path::full())
        .and_then(handlers::render_cinema)
}

pub fn create_room_filter(
    users: UserMap,
    rooms: Rooms,
    urls: Urls,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("createroom")
        .and(warp::path::end())
        .and(warp::get())
        .and(auth(users))
        .and(with_rooms(rooms))
        .and(with_urls(urls))
        .and(warp::query::<UrlQuery>())
        .and_then(handlers::create_room)
}

pub fn wwf_redirect(
    users: UserMap,
    urls: Urls,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("wwf")
        .and(auth(users))
        .and(warp::path::param::<String>())
        .and(with_urls(urls))
        .and_then(handlers::wwf_lookup_redirect)
}

fn with_sp(sp: Sp) -> impl Filter<Extract = (Sp,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || sp.clone())
}

fn with_hba(hba: Hba) -> impl Filter<Extract = (Hba,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || hba.clone())
}

fn with_users_map(users: UserMap) -> impl Filter<Extract = (UserMap,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || users.clone())
}

pub fn with_rooms(rooms: Rooms) -> impl Filter<Extract = (Rooms,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || rooms.clone())
}

fn with_urls(urls: Urls) -> impl Filter<Extract = (Urls,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || urls.clone())
}

pub fn auth(users: UserMap) -> impl Filter<Extract = (Authenticated,), Error = warp::Rejection> + Clone {
    warp::header::<String>("Authorization")
        .and(with_users_map(users))
        .and_then(|header: String, users: UserMap| async move {
            let (u,p) = parse_auth_header(&header);
            let users = users.lock().await;
            if let Some(hashed_password) = users.get(&u) {
                if verify(hashed_password, p.as_bytes()) {
                    return Ok(Authenticated);
                }
            }
            Err(warp::reject::custom(rejections::InvalidCredentials))
        })
}

fn parse_auth_header(header: &str) -> (String, String) {
    let header_parts: Vec<&str> = header.split(" ").collect();
    let b64auth = header_parts[1];
    let decoded = base64::decode(b64auth.as_bytes()).unwrap();
    let decoded_str = std::str::from_utf8(decoded.as_slice()).unwrap();
    let auth_parts: Vec<&str> = decoded_str.splitn(2, ":").collect();
    let username = auth_parts[0];
    let password = auth_parts[1];
    return (username.to_owned(), password.to_owned());
}

pub async fn recover_auth(err: warp::Rejection) -> Result<impl warp::Reply, warp::reject::Rejection> {
    if let Some(_) = err.find::<rejections::InvalidCredentials>() {
        let msg = "Access Denied. Incorrect username or password";
        let with_header = warp::reply::with_header(msg, "Www-Authenticate", r#"Basic realm="Authentication Required""#);
        let with_header_and_status = warp::reply::with_status(with_header, StatusCode::UNAUTHORIZED);
        Ok(with_header_and_status)
    } else if let Some(_) = err.find::<warp::reject::MissingHeader>() {
        let msg = "Missing Header";
        let with_header = warp::reply::with_header(msg, "Www-Authenticate", r#"Basic realm="Authentication Required""#);
        let with_header_and_status = warp::reply::with_status(with_header, StatusCode::UNAUTHORIZED);
        Ok(with_header_and_status)
    } else {
        Err(warp::reject())
    }
}