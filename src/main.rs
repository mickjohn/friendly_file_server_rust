use std::error::Error;
use std::env;
use std::path::PathBuf;
use warp::Filter;
use warp::http::header::{HeaderMap, HeaderValue};
use warp::http::Uri;
use url::form_urlencoded::parse;
use argon2::{self, Config};
use rand::Rng;

#[macro_use]
extern crate lazy_static;

mod fs_utils;
mod hb_helpers;
mod args;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {

    if env::var_os("RUST_LOG").is_none() {
        env::set_var("RUST_LOG", "debug");
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
    let api = filters::create_listing(sp, hba, users);
    let static_files = warp::path("static").and(warp::fs::dir("static"));
    let files = warp::path("browse")
                    .and(warp::fs::dir(root_path))
                    .with(warp::reply::with::headers(headers));
    let redirect = warp::any().map(|| warp::redirect(Uri::from_static("/browse/")));

    // View access logs by setting `RUST_LOG=todos`.
    let routes = api.recover(filters::recover_auth)
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

mod filters {
    use super::handlers;
    use super::models::{Sp, Hba, UserMap};
    use futures::{FutureExt, StreamExt};
    use warp::Filter;
    use warp::http::StatusCode;
    use base64;
    use std::str;

    pub fn create_listing<'a>(
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

    fn with_sp(sp: Sp) -> impl Filter<Extract = (Sp,), Error = std::convert::Infallible> + Clone {
        warp::any().map(move || sp.clone())
    }

    fn with_hba(hba: Hba) -> impl Filter<Extract = (Hba,), Error = std::convert::Infallible> + Clone {
        warp::any().map(move || hba.clone())
    }

    fn with_users_map(users: UserMap) -> impl Filter<Extract = (UserMap,), Error = std::convert::Infallible> + Clone {
        warp::any().map(move || users.clone())
    }

    #[derive(Clone)]
    pub struct Authenticated;

    #[derive(Debug, Clone)]
    pub struct IncorrectCreds;
    impl warp::reject::Reject for IncorrectCreds{}

    pub fn auth(users: UserMap) -> impl Filter<Extract = (Authenticated,), Error = warp::Rejection> + Clone {
        warp::header::<String>("Authorization")
            .and(with_users_map(users))
            .and_then(|header: String, users: UserMap| async move {
                let (u,p) = parse_auth_header(&header);
                let users = users.lock().await;
                if let Some(password) = users.get(&u) {
                    if password == &p {
                        return Ok(Authenticated);
                    }
                }
                Err(warp::reject::custom(IncorrectCreds))
            })
    }

    fn parse_auth_header(header: &str) -> (String, String) {
        let header_parts: Vec<&str> = header.split(" ").collect();
        let b64auth = header_parts[1];
        let decoded = base64::decode(b64auth.as_bytes()).unwrap();
        let decoded_str = std::str::from_utf8(decoded.as_slice()).unwrap();
        let mut auth_parts: Vec<&str> = decoded_str.split(":").collect();
        let username = auth_parts.remove(0);
        let password = auth_parts.join("");
        return (username.to_owned(), password.to_owned());
    }

    pub async fn recover_auth(err: warp::Rejection) -> Result<impl warp::Reply, warp::reject::Rejection> {
        println!("Rejection Error = {:?}", err);
        // println!("Reason = {:?}", err.status());
        if let Some(_incorrect_creds) = err.find::<IncorrectCreds>() {
            println!("Incorrect Credentials...");
            let msg = "Access Denied. Incorrect username or password";
            let with_header = warp::reply::with_header(msg, "Www-Authenticate", r#"Basic realm="Authentication Required""#);
            let with_header_and_status = warp::reply::with_status(with_header, StatusCode::UNAUTHORIZED);
            Ok(with_header_and_status)
        } else if let Some(_missing_header) = err.find::<warp::reject::MissingHeader>() {
            println!("Missing header...");
            let msg = "Missing Header";
            let with_header = warp::reply::with_header(msg, "Www-Authenticate", r#"Basic realm="Authentication Required""#);
            let with_header_and_status = warp::reply::with_status(with_header, StatusCode::UNAUTHORIZED);
            Ok(with_header_and_status)
        } else {
            Err(warp::reject())
        }
    }

    pub fn websocket () {
        let routes = warp::path("echo")
                // The `ws()` filter will prepare the Websocket handshake.
                .and(warp::ws())
                .map(|ws: warp::ws::Ws| {
                    // And then our closure will be called when it completes...
                    ws.on_upgrade(|websocket| {
                        // Just echo all messages back...
                        let (tx, rx) = websocket.split();
                        rx.forward(tx).map(|result| {
                            if let Err(e) = result {
                                eprintln!("websocket error: {:?}", e);
                            }
                        })
                    })
                });
    }
}

mod handlers {
    use super::models::{Hba, Sp};
    use super::filters::Authenticated;
    use std::collections::HashMap;
    use std::path::PathBuf;
    use warp::path::FullPath;

    pub fn fp_to_path(fp: &FullPath) -> PathBuf {
        let decoded: String = super::parse(fp.as_str().as_bytes())
            .map(|(key, val)| [key, val].concat())
            .collect();
        let path_str = decoded.as_str().replace("/browse/", "").replace("/", "\\");
        PathBuf::from(&path_str)
    }

    pub async fn render_index<'a>(_: Authenticated, sp: Sp, hba: Hba<'a>, fp: warp::path::FullPath) -> Result<impl warp::Reply, warp::Rejection> {
        let path = fp_to_path(&fp);
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
}

mod models {
    use std::sync::Arc;
    use std::collections::HashMap;
    use tokio::sync::Mutex;
    use super::fs_utils::ServePoint;
    use std::path::PathBuf;
    use handlebars::Handlebars;

    use crate::hb_helpers;

    pub type Sp = Arc<Mutex<ServePoint>>;
    pub type UserMap = Arc<Mutex<HashMap<String, String>>>;
    // pub type UserMap = Arc<HashMap<String, String>>;

    #[derive(Clone)]
    pub struct Hba<'a> {
        pub hba: Arc<Mutex<Handlebars<'a>>>,
    }

    pub fn new_serve_point(path: PathBuf) -> Sp {
        Arc::new(Mutex::new(ServePoint::new(path)))
    }

    pub fn new_users(users: HashMap<String, String>) -> UserMap {
        Arc::new(Mutex::new(users))
        // Arc::new(users)
    }

    pub fn new_handlebars_arc<'a>() -> Hba<'a> {
        let mut hb = Handlebars::new();
        // register the template
        hb.register_template_string("listing.html", hb_helpers::LISTING_TEMPLATE).unwrap();

        // Register the helpers
        hb.register_helper("is_mp4", Box::new(hb_helpers::is_mp4));
        hb.register_helper("icon_for_ext", Box::new(hb_helpers::icon_for_ext));
        hb.register_helper("urlencode", Box::new(hb_helpers::urlencode));

        Hba {
            hba: Arc::new(Mutex::new(hb)),
        }
    }
}