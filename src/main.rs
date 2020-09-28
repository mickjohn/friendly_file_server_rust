use std::error::Error;
use std::env;
use std::path::PathBuf;
use warp::Filter;
use warp::http::header::{HeaderMap, HeaderValue};
use argon2::{self, Config};
use rand::Rng;
use warp::http::Uri;

#[macro_use]
extern crate lazy_static;

#[macro_use]
extern crate log;

mod fs_utils;
mod hb_helpers;
mod args;
mod webserver;

use crate::webserver::{models, filters, websocket};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    if env::var_os("RUST_LOG").is_none() {
        env::set_var("RUST_LOG", "info");
    }
    pretty_env_logger::init();

    let config = args::parse_config_from_args()?;
    let root_path = PathBuf::from(&config.sharedir);

    let mut headers = HeaderMap::new();
    headers.insert("Content-Disposition", HeaderValue::from_static("attachement"));

    // Data models
    let sp = models::new_serve_point(root_path.clone());
    let hba = models::new_handlebars_arc();
    let users = models::new_users(config.users.clone());
    let rooms = models::Rooms::default();
    let urls = models::Urls::default();


    // Filters
    // The 'cinema' page, i.e. where users can 
    let cinema = filters::render_cinema_page(sp.clone(), hba.clone() , users.clone());
    let listing = filters::render_file_listing(sp, hba, users.clone());
    let static_files = warp::path("static")
                        .and(filters::auth(users.clone()))
                        .and(warp::fs::dir("static"))
                        .map(|_ : filters::Authenticated, file| file);

    // The endpoint used to create a Websocket cinema room
    let create_room = filters::create_room_filter(users.clone(), rooms.clone(), urls.clone());

    // Endpoint to check if room exists
    let check_room = filters::check_room_filter(users.clone(), rooms.clone());

    // The endpoint to serve files. Should be used AFTER the 'api' filter, in order 
    // to ensure that Directories get rendered as an index, and that this serves 
    // the files
    let files = warp::path("browse")
                    .and(filters::auth(users.clone()))
                    .and(warp::fs::dir(root_path.clone()))
                    .map(|_: filters::Authenticated, file| file )
                    .with(warp::reply::with::headers(headers));

    // The websocket enpoint used to join the rooms
    let websocket = warp::path("rooms")
                    .and(warp::path::param::<String>())
                    .and(warp::path::end())
                    .and(warp::ws())
                    .and(filters::with_rooms(rooms))
                    .map(|code: String, ws: warp::ws::Ws, rooms: models::Rooms| {
                        ws.on_upgrade(move |socket| websocket::user_connected(socket, code, rooms))
                    });

    // Redirect index to browse endpoint
    let redirect = warp::path::end().map(|| warp::redirect(Uri::from_static("/browse/")));

    // Redirect the shortened URLS
    let wwf_redirect = filters::wwf_redirect(users.clone(), urls);

    let routes = listing.recover(filters::recover_auth)
                   .or(cinema.recover(filters::recover_auth))
                   .or(create_room.recover(filters::recover_auth))
                   .or(check_room.recover(filters::recover_auth))
                   .or(files.recover(filters::recover_auth))
                   .or(static_files.recover(filters::recover_auth))
                   .or(wwf_redirect.recover(filters::recover_auth))
                   .or(websocket)
                   .or(redirect);

    // Start up the server...
    warp::serve(routes).run((config.ipaddr, config.port)).await;
    Ok(())
}

pub fn hash(password: &[u8]) -> String {
    let salt = rand::thread_rng().gen::<[u8; 32]>();
    let config = Config::default();
    argon2::hash_encoded(password, &salt, &config).unwrap()
}

pub fn verify(hash: &str, password: &[u8]) -> bool {
    argon2::verify_encoded(hash, password).unwrap_or(false)
}