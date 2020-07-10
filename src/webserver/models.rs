use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::Mutex;
use crate::fs_utils::ServePoint;
use std::path::PathBuf;
use handlebars::Handlebars;

use crate::hb_helpers;

pub type Sp = Arc<Mutex<ServePoint>>;
pub type UserMap = Arc<Mutex<HashMap<String, String>>>;
pub type Rooms = Arc<Mutex<HashMap<String, String>>>;

#[derive(Clone)]
pub struct Hba<'a> {
    pub hba: Arc<Mutex<Handlebars<'a>>>,
}

pub struct Room {
    pub id: u64,
    pub url: Option<String>,
    pub users: Vec<String>,
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