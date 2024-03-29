use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::{mpsc, Mutex};
// use tokio_postgres::Client;
use std::path::PathBuf;
use handlebars::Handlebars;
use warp::ws::Message;
use serde::{Deserialize, Serialize};
use futures::future::{AbortHandle};

use crate::fs_utils::ServePoint;
use crate::hb_helpers;
use crate::webserver::messages::{PlayerState, StatsStruct};

#[derive(Copy, Clone, Debug, PartialEq, PartialOrd)]
pub enum UserRole {
    ReadOnly,
    Uploader,
    Admin,
}

#[derive(Clone, Debug, PartialEq)]
pub struct AuthenticatedUser {
    pub username: String,
    pub role: UserRole,
    pub password: String,
}

impl AuthenticatedUser {
    #[cfg(test)]
    pub fn new(username: String, password: String, role: UserRole) -> Self {
        AuthenticatedUser { username, role, password }
    }
}

#[derive(Deserialize)]
pub struct UrlQuery {
    pub url: String,
}

#[derive(Deserialize)]
pub struct RoomCodeQuery {
    pub room: String,
}

pub type Sp = Arc<Mutex<ServePoint>>;
pub type UserMap = Arc<Mutex<HashMap<String, AuthenticatedUser>>>;

#[derive(Clone)]
pub struct Hba<'a> {
    pub hba: Arc<Mutex<Handlebars<'a>>>,
}

// For websockets
pub type Sender = mpsc::UnboundedSender<Result<Message, warp::Error>>;
pub type Rooms = Arc<Mutex<HashMap<String, Room>>>;
pub type RoomCleaner = Arc<Mutex<HashMap<String, AbortHandle>>>;
pub type Urls = Arc<Mutex<HashMap<String, String>>>;
// pub type CatalogueArc = Arc<Mutex<Catalogue>>;
// pub type DbClientArc= Arc<Mutex<Client>>;

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

pub fn new_users(users: HashMap<String, AuthenticatedUser>) -> UserMap {
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

// pub fn new_catalogue(catalogue: Catalogue) -> CatalogueArc {
//     Arc::new(Mutex::new(catalogue))
// }

// pub fn new_db_client(client: Client) -> DbClientArc {
//     Arc::new(Mutex::new(client))
// }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_roles_ordering() {
        assert!(UserRole::Admin == UserRole::Admin);
        assert!(UserRole::Admin > UserRole::Uploader);
        assert!(UserRole::Admin > UserRole::ReadOnly);

        assert!(UserRole::Uploader < UserRole::Admin);
        assert!(UserRole::Uploader == UserRole::Uploader);
        assert!(UserRole::Uploader > UserRole::ReadOnly);

        assert!(UserRole::ReadOnly < UserRole::Admin);
        assert!(UserRole::ReadOnly < UserRole::Uploader);
        assert!(UserRole::ReadOnly == UserRole::ReadOnly);
    }
}