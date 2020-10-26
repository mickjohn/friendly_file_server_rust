use std::path::Path;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::{mpsc, Mutex};
use std::path::PathBuf;
use handlebars::Handlebars;
use warp::ws::Message;
use serde::{Deserialize, Serialize};
use futures::future::{AbortHandle};

use crate::fs_utils::ServePoint;
use crate::hb_helpers;
use crate::webserver::messages::{PlayerState, StatsStruct};
use crate::movies::{self, Catalogue};


#[derive(Deserialize)]
pub struct UrlQuery {
    pub url: String,
}

#[derive(Deserialize)]
pub struct RoomCodeQuery {
    pub room: String,
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
pub type RoomCleaner = Arc<Mutex<HashMap<String, AbortHandle>>>;
pub type Urls = Arc<Mutex<HashMap<String, String>>>;
pub type CatalogueArc = Arc<Mutex<Catalogue>>;

// For websockets
pub struct Room {
    pub id: String,
    pub users_by_id: HashMap<usize, User>,
    pub director: Option<String>,
}

impl Room {
    pub fn new(id: String) -> Self {
        return Room {
            id,
            users_by_id: HashMap::new(),
            director: None,
        }
    }
    
    pub fn add_user(&mut self, id: usize, u: User) {
        self.users_by_id.insert(id, u);
    }

    pub fn remove_user(&mut self, id: &usize) {
        self.users_by_id.remove(id);
    }
}

// For websockets
#[derive(Clone)]
pub struct User {
    pub user_data: UserData,
    pub sender: Sender,
}

#[derive(Clone, Debug, Serialize)]
pub struct UserData {
    pub id: usize,
    pub name: String,
    pub time: f64,
    pub state: PlayerState,
    pub director: bool,
}

impl UserData {
    pub fn new_with_defaults(id: usize) -> Self {
        return Self {
            id: id,
            name: "".to_owned(),
            time: 0.0,
            state: PlayerState::Paused,
            director: false,
        }
    }

    pub fn to_stats_struct<'a>(&'a self) -> StatsStruct<'a> {
        return StatsStruct {
            id: self.id,
            name: &self.name,
            time: self.time,
            player_state: self.state.clone(),
            director: self.director,
        }
    }
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

pub fn new_room_cleaner() -> RoomCleaner {
    Arc::new(Mutex::new(HashMap::new()))
}

pub fn new_catalogue(path: &Path) -> Result<CatalogueArc, String> {
    let c = movies::load_catalogue_from_file(path)?;
    Ok(Arc::new(Mutex::new(c)))
}