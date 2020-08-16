use futures::{FutureExt, StreamExt};
use warp::ws::{Message, WebSocket};
use super::models::{Rooms, User, Room};
use rand::{Rng, SeedableRng};
use rand::rngs::SmallRng;
use super::messages::Messages;
use serde_json;
use tokio::sync::mpsc;

pub async fn user_connected(ws: WebSocket, code: String, rooms_arc: Rooms) {
    info!("Websocket user connected. code = {}", code);

    // Split the socket into a sender and receive of messages.
    let (user_ws_tx, mut user_ws_rx) = ws.split();

    // Use an unbounded channel to handle buffering and flushing of messages
    // to the websocket...
    let (tx, rx) = mpsc::unbounded_channel();
    tokio::task::spawn(rx.forward(user_ws_tx).map(|result| {
        if let Err(e) = result {
            eprintln!("websocket send error: {}", e);
        }
    }));

    let mut small_rng = SmallRng::from_entropy();
    let my_id: usize = small_rng.gen();
    let user = User {
        id: my_id,
        sender: tx,
    };

    // Limit the scope of the mutext lock
    {
        let mut rooms = rooms_arc.lock().await;
        let room: &mut Room = rooms.get_mut(&code).unwrap();
        room.users_by_id.insert(my_id, user.clone());
    }

    // Every time the user sends a message, broadcast it to
    // all other users...
    while let Some(result) = user_ws_rx.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("websocket error(uid={}): {}", my_id, e);
                break;
            }
        };
        user_msg_recieved(my_id, code.clone(), msg, rooms_arc.clone()).await;
    }

    // user_ws_rx stream will keep processing as long as the user stays
    // connected. Once they disconnect, then...
    user_disconnected(my_id, code, rooms_arc.clone()).await;
}

async fn user_disconnected(my_id: usize, code: String, rooms: Rooms) {
    info!("Deleting user {} from room {}", my_id, code);
    let mut rooms = rooms.lock().await;
    let room = rooms.get_mut(&code).unwrap();

    // Send disconnected message to rest of users
    let msg = Messages::Disconnected { 
        id: my_id,
    };
    let msg_s = serde_json::to_string(&msg).unwrap();

    for user in room.users_by_id.values() {
        if user.id != my_id {
        let tx = &user.sender;
        let _ = tx.send(Ok(Message::text(&msg_s)));
        }
    }
    room.users_by_id.remove(&my_id);
}

async fn user_msg_recieved(my_id: usize, code: String, msg: warp::filters::ws::Message, rooms_arc: Rooms) {
        let msg = if let Ok(s) = msg.to_str() { s } else { return; };
        if let Ok(parsed_msg) = serde_json::from_str::<Messages>(msg) {
            let mut rooms = rooms_arc.lock().await;
            let room: &mut Room = rooms.get_mut(&code).unwrap();

            match parsed_msg {
                // Echo the Play,Pause,Seeked & Stats message back to EVERYONE in the room.
                Messages::Play{name: _}
                | Messages::Pause{name: _} 
                | Messages::Seeked{name: _, time: _} 
                => {
                    for user in room.users_by_id.values() {
                        let tx = &user.sender;
                        let _ = tx.send(Ok(Message::text(msg)));
                    }
                },

                // Return the Stats message with the ID added
                Messages::Stats{name: n, time: t, player_state: p} => {
                    for user in room.users_by_id.values() {
                        let resp = Messages::StatsResponse{name: &n, time: t, id: my_id, player_state: p.clone()};
                        let resp_str = serde_json::to_string(&resp).unwrap();
                        let tx = &user.sender;
                        let _ = tx.send(Ok(Message::text(&resp_str)));
                    }
                },

                _ => {},
            };
        } else {
            return;
        }
}