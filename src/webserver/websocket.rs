use futures::{FutureExt, StreamExt};
use warp::Filter;
use rand::Rng;

fn gen_id() -> u64 {
    let mut rng = rand::thread_rng();
    rng.gen()
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

    let routes1 = warp::path("echo")
            .and(warp::ws())
            .map(|ws: warp::ws::Ws| {
                ws.on_upgrade(|websocket| {
                    let (tx, rx) = websocket.split();
                    rx.forward(tx).map(|result| {
                        if let Err(e) = result {
                            eprintln!("websocket error: {:?}", e);
                        }
                    })
                })
            });
}