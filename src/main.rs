use std::error::Error;
use std::env;
use std::path::PathBuf;
use warp::Filter;
use warp::http::header::{HeaderMap, HeaderValue};
use warp::http::Uri;
use argon2::{self, Config};
use rand::Rng;

#[macro_use]
extern crate lazy_static;

mod fs_utils;
mod hb_helpers;
mod args;
mod webserver;

use crate::webserver::{models, filters};

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


    // Filters
    let cinema = filters::create_cinema_page(sp.clone(), hba.clone() , users.clone());
    let api = filters::create_listing(sp, hba, users);
    let static_files = warp::path("static").and(warp::fs::dir("static"));
    let files = warp::path("browse")
                    .and(warp::fs::dir(root_path.clone()))
                    .with(warp::reply::with::headers(headers));

    // let redirect = warp::any().map(|| warp::redirect(Uri::from_static("/browse/")));

    // View access logs by setting `RUST_LOG=todos`.
    let routes = api.recover(filters::recover_auth)
                   .or(cinema.recover(filters::recover_auth))
                   .or(files)
                   .or(static_files);
                //    .or(redirect);

    // Start up the server...
    warp::serve(routes).run((config.ipaddr, config.webport)).await;
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