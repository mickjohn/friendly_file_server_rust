use std::env;
use warp::Filter;
use std::path::PathBuf;
use url::form_urlencoded::parse;
use warp::http::header::{HeaderMap, HeaderValue};
use std::error::Error;

#[macro_use]
extern crate lazy_static;

mod fs_utils;
mod hb_helpers;
mod args;
use bcrypt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {

    if env::var_os("RUST_LOG").is_none() {
        env::set_var("RUST_LOG", "info");
    }
    pretty_env_logger::init();

    let config = args::parse_config_from_args()?;

    let mut headers = HeaderMap::new();
    headers.insert("Content-Disposition", HeaderValue::from_static("attachement"));

    let root_path = PathBuf::from(r"D:\Downloads");
    let sp = models::new_server_point(root_path);
    let hba = models::new_handlebars_arc();

    let api = filters::create_listing(sp, hba);
    let static_files = warp::path("static").and(warp::fs::dir("static"));
    let files = warp::path("browse")
                    .and(warp::fs::dir(r"D:\Downloads"))
                    .with(warp::reply::with::headers(headers));

    // View access logs by setting `RUST_LOG=todos`.
    let routes = api
                   .or(files)
                   .or(static_files);

    // Start up the server...
    warp::serve(routes).run((config.ipaddr, config.webport)).await;
    Ok(())
}

mod filters {
    use super::handlers;
    use super::models::{Sp, Hba};
    use warp::Filter;

    pub fn create_listing<'a>(
        sp: Sp,
        hba: Hba<'a>,
    ) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone + 'a {
        warp::path!("browse" / ..)
            .and(warp::get())
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

    // async fn with_existing_file(sp: Sp) -> impl Filter<Extract = (PathBuf,), Error = warp::Rejection> + Clone {
    //     warp::any().and(warp::path::full()).and(with_sp(sp)).and_then(|fp: FullPath, sp: Sp| async move {
    //         let path = handlers::fp_to_path(&fp);
    //         if true {
    //             Ok(path.clone())
    //         } else {
    //             Err(warp::reject())
    //         }
    //     })
    // }
}


mod handlers {
    use super::models::{Hba, Sp};
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

    pub async fn render_index<'a>(sp: Sp, hba: Hba<'a>, fp: warp::path::FullPath) -> Result<impl warp::Reply, warp::Rejection> {
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
    use tokio::sync::Mutex;
    use super::fs_utils::ServePoint;
    use std::path::PathBuf;
    use handlebars::Handlebars;

    use crate::hb_helpers;

    pub type Sp = Arc<Mutex<ServePoint>>;

    #[derive(Clone)]
    pub struct Hba<'a> {
        pub hba: Arc<Mutex<Handlebars<'a>>>,
    }

    pub fn new_server_point(path: PathBuf) -> Sp {
        Arc::new(Mutex::new(ServePoint::new(path)))
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