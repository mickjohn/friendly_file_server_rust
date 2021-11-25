use crate::verify;
use super::handlers;
use super::rejections;
use super::models::{Sp,
    Hba,
    UserMap,
    Rooms,
    Urls,
    UrlQuery,
    RoomCodeQuery,
    RoomCleaner,
    // DbClientArc,
    AuthenticatedUser,
    UserRole,
};

use warp::Filter;
use warp::http::StatusCode;
use base64;
use std::str;

const FORBIDDEN: &'static str = "
<!DOCTYPE html>
<html>
    <body>
        <h1>403 Forbidden</h1>
        <h3>You are not authorized to visit this page</h3>
    </body>
</html> 
";

#[derive(Clone)]
pub struct Authenticated;

pub fn render_file_listing<'a>(
    sp: Sp,
    hba: Hba<'a>,
    users: UserMap,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone + 'a {
    warp::path!("browse" / ..)
        .and(warp::get())
        .and(auth_restricted(users, UserRole::Admin))
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
    rooms_cleaner: RoomCleaner,
    urls: Urls,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("createroom")
        .and(warp::path::end())
        .and(warp::get())
        .and(auth(users))
        .and(with_rooms(rooms))
        .and(with_room_cleaner(rooms_cleaner))
        .and(with_urls(urls))
        .and(warp::query::<UrlQuery>())
        .and_then(handlers::create_room)
}

pub fn check_room_filter(
    users: UserMap,
    rooms: Rooms,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("checkroom")
        .and(warp::path::end())
        .and(warp::get())
        .and(auth(users))
        .and(with_rooms(rooms))
        .and(warp::query::<RoomCodeQuery>())
        .and_then(handlers::check_room)
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

// pub fn get_catalogue(
//     users: UserMap,
//     client: DbClientArc,
// ) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
//     warp::get()
//         .and(warp::path("catalogue"))
//         .and(warp::path::end())
//         .and(auth(users))
//         .and(with_db_client(client))
//         .and_then(handlers::get_catalogue)
// }

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

pub fn with_room_cleaner(cleaner: RoomCleaner) -> impl Filter<Extract = (RoomCleaner,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || cleaner.clone())
}

fn with_urls(urls: Urls) -> impl Filter<Extract = (Urls,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || urls.clone())
}

// fn with_db_client(client: DbClientArc) -> impl Filter<Extract = (DbClientArc,), Error = std::convert::Infallible> + Clone {
//     warp::any().map(move || client.clone())
// }

async fn check_auth(header: &str, users: &UserMap) -> Option<AuthenticatedUser> {
    let (u,p) = parse_auth_header(header);
    let users =  users.lock().await;

    if let Some(user) = users.get(&u) {
        if verify(&user.password, p.as_bytes()) {
            return Some(user.clone());
        }
    }
    return None;
}

pub fn auth(users: UserMap) -> impl Filter<Extract = (Authenticated,), Error = warp::Rejection> + Clone {
    warp::header::<String>("Authorization")
        .and(with_users_map(users))
        .and_then(|header: String, users: UserMap| async move {
            let user = check_auth(&header, &users).await;
            if user.is_some() {
                return Ok(Authenticated);
            }

            Err(warp::reject::custom(rejections::InvalidCredentials))
        })
}

/// Requires that the user had the AT LEAST the role that is provided to this
/// function in order to access the resource.
pub fn auth_restricted(users: UserMap, role: UserRole) -> impl Filter<Extract = (Authenticated,), Error = warp::Rejection> + Clone {
    warp::header::<String>("Authorization")
        .and(with_users_map(users))
        .and_then(move |header: String, users: UserMap| async move {
            let user_opt = check_auth(&header, &users).await;
            if let Some(user) = user_opt {
                if user.role >= role {
                    return Ok(Authenticated);
                } else {
                    return Err(warp::reject::custom(rejections::Forbidden));
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

pub async fn recover_auth(err: warp::Rejection) -> Result<Box<dyn warp::Reply>, warp::reject::Rejection> {
    type RetVal = Result<Box<dyn warp::Reply>, warp::reject::Rejection>;
    let error_response : RetVal = if let Some(_) = err.find::<rejections::InvalidCredentials>() {
        let msg = "Access Denied. Incorrect username or password";
        let with_header = warp::reply::with_header(msg, "Www-Authenticate", r#"Basic realm="Authentication Required""#);
        let with_header_and_status = warp::reply::with_status(with_header, StatusCode::UNAUTHORIZED);
        Ok(Box::new(with_header_and_status))
    } else if let Some(_) = err.find::<warp::reject::MissingHeader>() {
        let msg = "Missing Header";
        let with_header = warp::reply::with_header(msg, "Www-Authenticate", r#"Basic realm="Authentication Required""#);
        let with_header_and_status = warp::reply::with_status(with_header, StatusCode::UNAUTHORIZED);
        Ok(Box::new(with_header_and_status))
    } else if let Some(_) = err.find::<rejections::Forbidden>() {
        let msg = warp::reply::html(FORBIDDEN);
        Ok(Box::new(warp::reply::with_status(msg, StatusCode::FORBIDDEN)))
    } else {
        Err(warp::reject())
    };
    return error_response ;
}