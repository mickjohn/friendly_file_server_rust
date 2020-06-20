use futures::{FutureExt, StreamExt, future};
use warp::Filter;
use warp::filters::path::FullPath;
use tokio;
use serde;

mod fs_utils;


#[tokio::main]
async fn main() {
    pretty_env_logger::init();

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


    let access_counter = warp::path::full()
        .map(move |path: FullPath| {
            println!("full path {:?}", path);
            format!("full path {:?}", path)
        });

    let test = warp::path!("browse" / ..)
        .and(access_counter)
        .map(|msg| {
            format!("Yolo {}", msg)
        });
        

    // let routes2 = warp::any()

    let x = warp::serve(test).run(([127, 0, 0, 1], 5000));
    let y = warp::serve(routes).run(([127, 0, 0, 1], 5001));
    future::join(x, y).await;
}
