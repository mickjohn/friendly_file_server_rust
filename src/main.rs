use std::env;
use warp::Filter;
use handlebars::Handlebars;
use std::path::PathBuf;
use warp::http::Uri;
use handlebars::{RenderContext, Helper, Context, JsonRender, HelperResult, Output};
use std::collections::HashMap;
use serde_json::value::Value;
use url::form_urlencoded::{byte_serialize, parse};

#[macro_use]
extern crate lazy_static;

mod fs_utils;

lazy_static! {
    static ref EXT_ICON_MAP: HashMap<&'static str, &'static str> = {
        let mut m = HashMap::new();
        m.insert("default", "blank_file_icon.svg");
        m.insert("jpg", "picture_file_icon.svg");
        m.insert("jpeg", "picture_file_icon.svg");
        m.insert("gif", "picture_file_icon.svg");
        m.insert("png", "picture_file_icon.svg");
        m.insert("bmp", "picture_file_icon.svg");
        m.insert("pdf", "text_file_icon.svg");
        m.insert("docx", "text_file_icon.svg");
        m.insert("doc", "text_file_icon.svg");
        m.insert("txt", "text_file_icon.svg");
        m.insert("srt", "text_file_icon.svg");
        m
    };
}

const LISTING_TEMPLATE: &'static str = include_str!("../templates/listing.html.hb");

/*
If given a json string that ends in ".mp4" reutrn true
Otherwise return an empty string (which will evaluate to false)
*/
fn is_mp4(h: &Helper, _: &Handlebars, _: &Context, _: &mut RenderContext, out: &mut dyn Output) -> HelperResult {
    let param = h.param(0).unwrap();
    match param.value() {
        Value::String(s) => {
            let value = if s.ends_with(".mp4") {
                Value::Bool(true)
            } else {
                Value::String("".to_owned())
            };
            out.write(value.render().as_ref())?;
        },
        _ => {
            out.write(Value::String("".to_owned()).render().as_ref())?;
        }
    };

    Ok(())
}


fn urlencode(h: &Helper, _: &Handlebars, _: &Context, _: &mut RenderContext, out: &mut dyn Output) -> HelperResult {
    let param = h.param(0).unwrap();
    match param.value() {
        Value::String(s) => {
            let urlencoded: String = byte_serialize(s.as_bytes()).collect();
            let value = Value::String(urlencoded);
            out.write(value.render().as_ref())?;
        },
        _ => {}
    };
    Ok(())
}

/*
Look at the extenstion for a filename and find an appropiate file icon
*/
fn icon_for_ext(h: &Helper, _: &Handlebars, _: &Context, _: &mut RenderContext, out: &mut dyn Output) -> HelperResult {
    let param = h.param(0).unwrap();
    match param.value() {
        Value::String(s) => {
            let parts = s.split(".").collect::<Vec<&str>>();

            // Get the extension of the string name
            if let Some(ext) = parts.last() {
                // Lookup the icon in the map, and return it's name
                if let Some(icon) = EXT_ICON_MAP.get(ext) {
                    let s: String = (*icon).to_owned();
                    out.write(Value::String(s).render().as_ref())?;
                } else {
                    let icon = String::from("blank_file_icon.svg");
                    out.write(Value::String(icon).render().as_ref())?;
                }
                return Ok(())
            }
            out.write(Value::String("".to_owned()).render().as_ref())?;
        },
        _ => {
            out.write(Value::String("".to_owned()).render().as_ref())?;
        }
    };

    Ok(())
}



#[tokio::main]
async fn main() {

    if env::var_os("RUST_LOG").is_none() {
        // Set `RUST_LOG=todos=debug` to see debug logs,
        // this only shows access logs.
        env::set_var("RUST_LOG", "todos=info");
    }
    pretty_env_logger::init();

    let redirects = warp::path("browse").map(|| warp::redirect(Uri::from_static("/browse/")));

    let root_path = PathBuf::from(r"D:\Downloads");
    println!("Root = {:?}", &root_path);
    println!("Exists? = {}", &root_path.exists());
    let sp = models::new_server_point(root_path);
    let hba = models::new_handlebars_arc();

    let api = filters::create_listing(sp, hba);

    // let browse = filters::browse(sp);

    // View access logs by setting `RUST_LOG=todos`.
    // let routes = api.with(warp::log("todos"));
    let routes = api.or(warp::path("static").and(warp::fs::dir("static")));
    // Start up the server...
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}

mod filters {
    use super::handlers;
    use super::models::{Sp, Hba};
    use warp::Filter;

    /// The 4 TODOs filters combined.
    // pub fn todos(
    //     db: Db,
    // ) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    //     todos_list(db.clone())
    //         .or(todos_create(db.clone()))
    //         .or(todos_update(db.clone()))
    //         .or(todos_delete(db))
    // }

    // /// GET /todos?offset=3&limit=5
    // pub fn todos_list(
    //     db: Db,
    // ) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    //     warp::path!("todos")
    //         .and(warp::get())
    //         .and(warp::query::<ListOptions>())
    //         .and(with_db(db))
    //         .and_then(handlers::list_todos)
    // }

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
}

/// These are our API handlers, the ends of each filter chain.
/// Notice how thanks to using `Filter::and`, we can define a function
/// with the exact arguments we'd expect from each filter in the chain.
/// No tuples are needed, it's auto flattened for the functions.
mod handlers {
    use super::models::{Db, ListOptions, Todo, Hba, Sp};
    use std::convert::Infallible;
    use warp::http::StatusCode;
    use super::fs_utils::DirectoryListing;
    use std::collections::HashMap;
    use std::path::Path;

    pub async fn list_todos(opts: ListOptions, db: Db) -> Result<impl warp::Reply, Infallible> {
        // Just return a JSON array of todos, applying the limit and offset.
        let todos = db.lock().await;
        let todos: Vec<Todo> = todos
            .clone()
            .into_iter()
            .skip(opts.offset.unwrap_or(0))
            .take(opts.limit.unwrap_or(std::usize::MAX))
            .collect();
        Ok(warp::reply::json(&todos))
    }

    pub async fn create_todo(create: Todo, db: Db) -> Result<impl warp::Reply, Infallible> {

        let mut vec = db.lock().await;

        for todo in vec.iter() {
            if todo.id == create.id {
                // Todo with id already exists, return `400 BadRequest`.
                return Ok(StatusCode::BAD_REQUEST);
            }
        }

        // No existing Todo with id, so insert and return `201 Created`.
        vec.push(create);

        Ok(StatusCode::CREATED)
    }

    pub async fn update_todo(
        id: u64,
        update: Todo,
        db: Db,
    ) -> Result<impl warp::Reply, Infallible> {
        let mut vec = db.lock().await;

        // Look for the specified Todo...
        for todo in vec.iter_mut() {
            if todo.id == id {
                *todo = update;
                return Ok(StatusCode::OK);
            }
        }


        // If the for loop didn't return OK, then the ID doesn't exist...
        Ok(StatusCode::NOT_FOUND)
    }

    pub async fn delete_todo(id: u64, db: Db) -> Result<impl warp::Reply, Infallible> {

        let mut vec = db.lock().await;

        let len = vec.len();
        vec.retain(|todo| {
            // Retain all Todos that aren't this id...
            // In other words, remove all that *are* this id...
            todo.id != id
        });

        // If the vec is smaller, we found and deleted a Todo!
        let deleted = vec.len() != len;

        if deleted {
            // respond with a `204 No Content`, which means successful,
            // yet no body expected...
            Ok(StatusCode::NO_CONTENT)
        } else {
            Ok(StatusCode::NOT_FOUND)
        }
    }

    pub async fn render_index<'a>(sp: Sp, hba: Hba<'a>, fp: warp::path::FullPath) -> Result<impl warp::Reply, warp::Rejection> {
        let sp = sp.lock().await;
        let decoded: String = super::parse(fp.as_str().as_bytes())
            .map(|(key, val)| [key, val].concat())
            .collect();
        let path_str = decoded.as_str().replace("/browse/", "").replace("/", "\\");
        let path = Path::new(&path_str);

        let listing = sp.get_directory_listing(path).unwrap();

        println!("listing = {}", serde_json::to_string(&listing).unwrap());
        let mut data = HashMap::new();
        data.insert(String::from("listing"), listing);

        let render = hba.hba.lock().await
            .render("listing.html", &data)
            .unwrap_or_else(|err| err.to_string());
        Ok(warp::reply::html(render))
    }
}

mod models {
    use serde::{Deserialize, Serialize};
    use std::sync::Arc;
    use tokio::sync::Mutex;
    use super::fs_utils::ServePoint;
    use std::path::PathBuf;
    use handlebars::Handlebars;

    /// So we don't have to tackle how different database work, we'll just use
    /// a simple in-memory DB, a vector synchronized by a mutex.
    pub type Db = Arc<Mutex<Vec<Todo>>>;
    pub type Sp = Arc<Mutex<ServePoint>>;
    // pub type Hba = Arc<Mutex<Handlebars<'a>>>;

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
        hb.register_template_string("listing.html", super::LISTING_TEMPLATE).unwrap();
        hb.register_helper("is_mp4", Box::new(super::is_mp4));
        hb.register_helper("icon_for_ext", Box::new(super::icon_for_ext));
        hb.register_helper("urlencode", Box::new(super::urlencode));

        Hba {
            hba: Arc::new(Mutex::new(hb)),
        }
    }



    #[derive(Debug, Deserialize, Serialize, Clone)]
    pub struct Todo {
        pub id: u64,
        pub text: String,
        pub completed: bool,
    }

    // The query parameters for list_todos.
    #[derive(Debug, Deserialize)]
    pub struct ListOptions {
        pub offset: Option<usize>,
        pub limit: Option<usize>,
    }
}