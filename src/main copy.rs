use futures::{FutureExt, StreamExt, future};
use warp::Filter;
use warp::filters::path::FullPath;
use tokio;
use serde::Serialize;
use serde_json::json;
use handlebars::Handlebars;
use std::sync::Arc;
use std::path::{PathBuf, Path};
use tokio::sync::Mutex;

mod fs_utils;

use fs_utils::*;

const listing_template: &'static str = include_str!("../templates/listing.html.hb");


struct WithTemplate<T: Serialize> {
    name: &'static str,
    value: T,
}

async fn render<T>(template: WithTemplate<T>, hbrs_mutex: Arc<Mutex<Handlebars>>) -> impl warp::Reply
where
    T: Serialize,
{
    let hbs = hbrs_mutex.lock().await;
    let render = hbs
        .render(template.name, &template.value)
        .unwrap();
        // .unwrap_or_else(|err| err.to_string());
    warp::reply::html(render)
}


// pub fn todos_list(
//     db: Db,
// ) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
//     warp::path!("todos")
//         .and(warp::get())
//         .and(warp::query::<ListOptions>())
//         .and(with_db(db))
//         .and_then(handlers::list_todos)
// }

async fn browse1(sp: Arc<ServePoint>) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let mut hb = Handlebars::new();
    hb.register_template_string("listing.html", listing_template) .unwrap();
    let hb_arc = Arc::new(Mutex::new(hb));
    let handlebars = move |with_template| render(with_template, hb_arc.clone());

    warp::get()
        .and(warp::path!("browse" / ..))
        .and(warp::path::full())
        .map(move |path: FullPath| {
            format!("{:?}", path)
        })
        .and(with_serve_point(sp))
        .map(move |path: String, sp: Arc<ServePoint>| {
            sp.get_directory_listing(Path::new(&path))
        })
        .map(|listing| {
            WithTemplate {
                name: "listing.html",
                value: json!({"listing" : "abc"}),
            }
        })
        .and_then(handlebars)
}

fn with_serve_point(serve_point: Arc<ServePoint>) -> impl Filter<Extract = (Arc<ServePoint>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || serve_point.clone())
}


#[tokio::main]
async fn main() {

    let root_path = PathBuf::from(r"D:\Downloads");
    let serve_point = fs_utils::ServePoint::new(root_path);
    let serve_point_arc = Arc::new(serve_point);

    pretty_env_logger::init();

    let mut hb = Handlebars::new();
    hb.register_template_string("listing.html", listing_template) .unwrap();
    let hb_arc = Arc::new(hb);
    // let handlebars = move |with_template| render(with_template, hb_arc.clone());

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

    // let browse = warp::get()
    //     .and(warp::path!("browse" / ..))
    //     .and(get_path)
    //     .map(|path: String| {
    //         dir_listing(path)
    //     })
    //     .map(|listing| {
    //         // println!("{}", serde_json::to_string_pretty(&listing.clone()).unwrap());
    //         WithTemplate {
    //             name: "listing.html",
    //             value: json!({"listing" : "abc"}),
    //         }
    //     })
    //     .map(handlebars);

        
    // let x = warp::serve(test).run(([127, 0, 0, 1], 5000));
    let y = warp::serve(routes).run(([127, 0, 0, 1], 5001));
    y.await;
    // future::join(x, y).await;
}
