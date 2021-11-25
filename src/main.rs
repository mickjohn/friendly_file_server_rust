use std::error::Error;
use std::env;
use std::path::PathBuf;
use warp::Filter;
use warp::http::header::{HeaderMap, HeaderValue};
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};
use warp::http::Uri;

#[macro_use]
extern crate lazy_static;

#[macro_use]
extern crate log;

mod fs_utils;
mod hb_helpers;
mod args;
mod webserver;
// mod db;
// mod db_models;

use crate::webserver::{models, filters, websocket};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    if env::var_os("RUST_LOG").is_none() {
        env::set_var("RUST_LOG", "friendly_file_server_rust=debug");
    }
    pretty_env_logger::init();
    info!("Initialising");

    let config = args::load_config()?;

    if config.check_password {
        check_password();
        return Ok(());
    }

    if config.encrypt_password {
        encrypt_password();
        return Ok(());
    }

    let root_path = PathBuf::from(&config.sharedir);

    let mut headers = HeaderMap::new();
    headers.insert("Content-Disposition", HeaderValue::from_static("attachement"));

    // TODO finish DB work
    // let db_conn_str = format!("host={} user=postgres password=mysecretpassword dbname=catalogue", &config.db_url);
    // let (client, connection) = tokio_postgres::connect(&db_conn_str, NoTls).await?;

    // tokio::spawn(async move {
    //     if let Err(e) = connection.await {
    //         eprintln!("connection error: {}", e);
    //     }
    // }); 

    // Data models
    let sp = models::new_serve_point(root_path.clone());
    let hba = models::new_handlebars_arc();
    let users = models::new_users(config.users.clone());
    let rooms = models::Rooms::default();
    let room_cleaner = models::new_room_cleaner();
    let urls = models::Urls::default();

    // TODO finish DB work
    // let db_client = models::new_db_client(client);

    // Filters
    // The 'cinema' page, i.e. where users can 
    let cinema = filters::render_cinema_page(sp.clone(), hba.clone() , users.clone());
    let listing = filters::render_file_listing(sp, hba, users.clone());
    let static_files = warp::path("static")
                        .and(filters::auth(users.clone()))
                        .and(warp::fs::dir("static"))
                        .map(|_ : filters::Authenticated, file| file);

    // The endpoint used to create a Websocket cinema room
    let create_room = filters::create_room_filter(users.clone(), rooms.clone(), room_cleaner.clone(), urls.clone());

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

    // The websocket endpoint used to join the rooms
    let websocket = warp::path("rooms")
                    .and(warp::path::param::<String>())
                    .and(warp::path::end())
                    .and(warp::ws())
                    .and(filters::with_rooms(rooms))
                    .and(filters::with_room_cleaner(room_cleaner))
                    .map(|code: String, ws: warp::ws::Ws, rooms: models::Rooms, cleaner: models::RoomCleaner| {
                        ws.on_upgrade(move |socket| websocket::user_connected(socket, code, rooms, cleaner))
                    });

    // TODO finish DB work
    // let get_catalogue = filters::get_catalogue(users.clone(), db_client.clone());
                        

    // Redirect index to browse endpoint
    let redirect = warp::path::end().map(|| warp::redirect(Uri::from_static("/browse/")));

    // Redirect the shortened URLS
    let wwf_redirect = filters::wwf_redirect(users.clone(), urls);

    // TODO finish DB work
    // let api_routes = warp::path("api").and(get_catalogue);

    let routes = listing.recover(filters::recover_auth)
                   .or(cinema.recover(filters::recover_auth))
                   .or(create_room.recover(filters::recover_auth))
                   .or(check_room.recover(filters::recover_auth))
                   .or(files.recover(filters::recover_auth))
                   .or(static_files.recover(filters::recover_auth))
                   .or(wwf_redirect.recover(filters::recover_auth))
                //    .or(api_routes.recover(filters::recover_auth))
                   .or(websocket)
                   .or(redirect);

    // Start up the server...

    info!("Starting server on {}.{}.{}.{}:{}",
            config.ipaddr[0],
            config.ipaddr[1],
            config.ipaddr[2],
            config.ipaddr[3],
            config.port);
    warp::serve(routes).run((config.ipaddr, config.port)).await;
    Ok(())
}

pub fn hash(password: &[u8]) -> String {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2.hash_password(password, &salt).unwrap().to_string()
}

pub fn verify(hash: &str, password: &[u8]) -> bool {
    let parsed_hash = PasswordHash::new(hash).unwrap();
    let argon2 = Argon2::default();
    argon2.verify_password(password, &parsed_hash).is_ok()
}

pub fn check_password() {
    use std::io::stdin;
    println!("Password Verifier.");
    println!("Enter ciphertext and plaintext separated by a space");
    let mut s = String::new();
    stdin().read_line(&mut s).expect("Did not enter a correct string");
    let strings: Vec<&str> = s.trim().split(" ").into_iter().collect();
    if strings.len() != 2 {
        panic!("Expected two words separated by spaces. Got {}", strings.len())
    }
    let ciphertext = strings[0];
    let plaintext = strings[1];
    println!("ciphertext = {}\nplaintext = {}", ciphertext, plaintext);
    println!("Is valid = {}", verify(ciphertext, plaintext.as_bytes()))
}

pub fn encrypt_password() {
    use std::io::stdin;
    println!("Password Encrypter.");
    println!("Enter plaintext. Spaces will be trimmed");
    let mut s = String::new();
    stdin().read_line(&mut s).expect("Did not enter a correct string");
    let password = s.trim();
    println!("Password = '{}'", password);
    let ciphertext = hash(password.as_bytes());
    println!("Ciphertext = '{}'", ciphertext)
}