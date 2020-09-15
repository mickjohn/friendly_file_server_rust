use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::{mpsc, Mutex};
use crate::fs_utils::ServePoint;
use std::path::PathBuf;
use handlebars::Handlebars;
use warp::ws::Message;
use serde::Deserialize;

use crate::hb_helpers;

#[derive(Deserialize)]
pub struct UrlQuery {
    pub url: String,
}

pub type Sp = Arc<Mutex<ServePoint>>;
pub type UserMap = Arc<Mutex<HashMap<String, String>>>;

#[derive(Clone)]
pub struct Hba<'a> {
    pub hba: Arc<Mutex<Handlebars<'a>>>,
}

// For websockets
pub type Sender = mpsc::UnboundedSender<Result<Message, warp::Error>>;
pub type Rooms = Arc<Mutex<HashMap<String, Room>>>;
pub type Urls = Arc<Mutex<HashMap<String, String>>>;

// For websockets
pub struct Room {
    pub id: String,
    pub users_by_id: HashMap<usize, User>,
    pub users_by_ws: HashMap<Sender, User>,
}

impl Room {
    pub fn new(id: String) -> Self {
        return Room {
            id,
            users_by_id: HashMap::new(),
            users_by_ws: HashMap::new(),
        }
    }
}

// For websockets
#[derive(Clone)]
pub struct User {
    pub id: usize,
    pub sender: Sender,
}

pub fn new_serve_point(path: PathBuf) -> Sp {
    Arc::new(Mutex::new(ServePoint::new(path)))
}

pub fn new_users(users: HashMap<String, String>) -> UserMap {
    Arc::new(Mutex::new(users))
}

pub fn new_handlebars_arc<'a>() -> Hba<'a> {
    let mut hb = Handlebars::new();
    // register the template
    hb.register_template_string("listing.html", hb_helpers::LISTING_TEMPLATE).unwrap();
    hb.register_template_string("cinema.html", hb_helpers::CINEMA_TEMPLATE).unwrap();

    // Register the helpers
    hb.register_helper("is_mp4", Box::new(hb_helpers::is_mp4));
    hb.register_helper("icon_for_ext", Box::new(hb_helpers::icon_for_ext));
    hb.register_helper("urlencode", Box::new(hb_helpers::urlencode));

    Hba {
        hba: Arc::new(Mutex::new(hb)),
    }
}