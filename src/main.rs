use std::env;
use warp::Filter;
use handlebars::Handlebars;
use std::path::PathBuf;
use warp::http::Uri;
use handlebars::{RenderContext, Helper, Context, JsonRender, HelperResult, Output};

mod fs_utils;

// use fs_utils::*;

/// Provides a RESTful web server managing some Todos.
///
/// API will be:
///
/// - `GET /todos`: return a JSON list of Todos.
/// - `POST /todos`: create a new Todo.
/// - `PUT /todos/:id`: update a specific Todo.
/// - `DELETE /todos/:id`: delete a specific Todo.

const LISTING_TEMPLATE: &'static str = include_str!("../templates/listing.html.hb");

// struct WithTemplate<T: Serialize> {
//     name: &'static str,
//     value: T,
// }

// fn render<T>(template: WithTemplate<T>, hbs: Arc<Handlebars>) -> impl warp::Reply
// where
//     T: Serialize,
// {
//     let render = hbs
//         .render(template.name, &template.value)
//         .unwrap_or_else(|err| err.to_string());
//     warp::reply::html(render)
// }


/*
If given a json string that ends in ".mp4" reutrn true
Otherwise return an empty string (which will evaluate to false)
*/
fn is_mp4(h: &Helper, _: &Handlebars, _: &Context, rc: &mut RenderContext, out: &mut dyn Output) -> HelperResult {
    use serde_json::value::Value;
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



#[tokio::main]
async fn main() {
    if env::var_os("RUST_LOG").is_none() {
        // Set `RUST_LOG=todos=debug` to see debug logs,
        // this only shows access logs.
        env::set_var("RUST_LOG", "todos=info");
    }
    pretty_env_logger::init();

    // let db = models::blank_db();
    // let browse_uri = Uri::from_static("/browse/");

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
    use super::models::{Db, ListOptions, Todo, Sp, Hba};
    use warp::Filter;
    use std::path::Path;

    /// The 4 TODOs filters combined.
    pub fn todos(
        db: Db,
    ) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
        todos_list(db.clone())
            .or(todos_create(db.clone()))
            .or(todos_update(db.clone()))
            .or(todos_delete(db))
    }

    /// GET /todos?offset=3&limit=5
    pub fn todos_list(
        db: Db,
    ) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
        warp::path!("todos")
            .and(warp::get())
            .and(warp::query::<ListOptions>())
            .and(with_db(db))
            .and_then(handlers::list_todos)
    }

    /// POST /todos with JSON body
    pub fn todos_create(
        db: Db,
    ) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
        warp::path!("todos")
            .and(warp::post())
            .and(json_body())
            .and(with_db(db))
            .and_then(handlers::create_todo)
    }

    /// PUT /todos/:id with JSON body
    pub fn todos_update(
        db: Db,
    ) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
        warp::path!("todos" / u64)
            .and(warp::put())
            .and(json_body())
            .and(with_db(db))
            .and_then(handlers::update_todo)
    }

    /// DELETE /todos/:id
    pub fn todos_delete(
        db: Db,
    ) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
        // We'll make one of our endpoints admin-only to show how authentication filters are used
        let admin_only = warp::header::exact("authorization", "Bearer admin");

        warp::path!("todos" / u64)
            // It is important to put the auth check _after_ the path filters.
            // If we put the auth check before, the request `PUT /todos/invalid-string`
            // would try this filter and reject because the authorization header doesn't match,
            // rather because the param is wrong for that other path.
            .and(admin_only)
            .and(warp::delete())
            .and(with_db(db))
            .and_then(handlers::delete_todo)
    }

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

    fn with_db(db: Db) -> impl Filter<Extract = (Db,), Error = std::convert::Infallible> + Clone {
        warp::any().map(move || db.clone())
    }

    fn with_sp(sp: Sp) -> impl Filter<Extract = (Sp,), Error = std::convert::Infallible> + Clone {
        warp::any().map(move || sp.clone())
    }

    fn with_hba(hba: Hba) -> impl Filter<Extract = (Hba,), Error = std::convert::Infallible> + Clone {
        warp::any().map(move || hba.clone())
    }

    fn json_body() -> impl Filter<Extract = (Todo,), Error = warp::Rejection> + Clone {
        // When accepting a body, we want a JSON body
        // (and to reject huge payloads)...
        warp::body::content_length_limit(1024 * 16).and(warp::body::json())
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
        let path_str = fp.as_str().replace("/browse/", "").replace("/", "\\");
        let path = Path::new(&path_str);

        let listing = sp.get_directory_listing(path).unwrap();

        println!("listing = {}", serde_json::to_string(&listing).unwrap());
        // println!("dirinfo = {:?}", listing.unwrap().trail);
        // println!("Path = {}", path_str);

        println!("Haloo from the handler!!!!");
        // let hb = hba.hba.lock();
        // super::render(, hbs: Arc<Handlebars>)
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

    pub fn blank_db() -> Db {
        Arc::new(Mutex::new(Vec::new()))
    }

    pub fn new_server_point(path: PathBuf) -> Sp {
        Arc::new(Mutex::new(ServePoint::new(path)))
    }

    pub fn new_handlebars_arc<'a>() -> Hba<'a> {
        let mut hb = Handlebars::new();
        // register the template
        hb.register_template_string("listing.html", super::LISTING_TEMPLATE).unwrap();
        hb.register_helper("is_mp4", Box::new(super::is_mp4));

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

#[cfg(test)]
mod tests {
    use warp::http::StatusCode;
    use warp::test::request;

    use super::{
        filters,
        models::{self, Todo},
    };

    #[tokio::test]
    async fn test_post() {
        let db = models::blank_db();
        let api = filters::todos(db);

        let resp = request()
            .method("POST")
            .path("/todos")
            .json(&Todo {
                id: 1,
                text: "test 1".into(),
                completed: false,
            })
            .reply(&api)
            .await;

        assert_eq!(resp.status(), StatusCode::CREATED);
    }

    #[tokio::test]
    async fn test_post_conflict() {
        let db = models::blank_db();
        db.lock().await.push(todo1());
        let api = filters::todos(db);

        let resp = request()
            .method("POST")
            .path("/todos")
            .json(&todo1())
            .reply(&api)
            .await;

        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_put_unknown() {
        let _ = pretty_env_logger::try_init();
        let db = models::blank_db();
        let api = filters::todos(db);

        let resp = request()
            .method("PUT")
            .path("/todos/1")
            .header("authorization", "Bearer admin")
            .json(&todo1())
            .reply(&api)
            .await;

        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    }

    fn todo1() -> Todo {
        Todo {
            id: 1,
            text: "test 1".into(),
            completed: false,
        }
    }
}
