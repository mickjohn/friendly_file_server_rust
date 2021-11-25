use futures::{FutureExt, StreamExt};
use warp::ws::{Message, WebSocket};
use super::models::{Rooms, User, Room, UserData, RoomCleaner};
use rand::{Rng, SeedableRng};
use rand::rngs::SmallRng;
use super::messages::{Messages, StatsStruct};
use serde_json;
use tokio::sync::mpsc;
use tokio::time;
use futures::future::{Abortable, AbortHandle};

static ROOM_DELETION_TIMEOUT: u64 = 30;

pub async fn user_connected(ws: WebSocket, code: String, rooms_arc: Rooms, cleaner: RoomCleaner) {
    info!("Websocket user connected. code = {}", code);

    // Split the socket into a sender and receive of messages.
    let (user_ws_tx, mut user_ws_rx) = ws.split();

    // Use an unbounded channel to handle buffering and flushing of messages
    // to the websocket...
    let (tx, rx) = mpsc::unbounded_channel();
    tokio::task::spawn(rx.forward(user_ws_tx).map(|result| {
        if let Err(e) = result {
            warn!("websocket send error: {}", e);
        }
    }));

    let mut small_rng = SmallRng::from_entropy();
    let my_id: usize = small_rng.gen();
    let user = User {
        user_data: UserData::new_with_defaults(my_id),
        sender: tx,
    };

    // Limit the scope of the mutex lock
    {
        let mut rooms = rooms_arc.lock().await;
        let mut cleaner_mtx = cleaner.lock().await;
        if cleaner_mtx.contains_key(&code) {
            info!("User rejoining cold room {}, scheduled deletion cleared", code);
            let abort_handle = &cleaner_mtx[&code];
            abort_handle.abort();
            let _ = &mut cleaner_mtx.remove(&code);
        }
        let room: &mut Room = rooms.get_mut(&code).unwrap();
        room.add_user(my_id, user.clone());
    }

    // Every time the user sends a message, broadcast it to
    // all other users...
    while let Some(result) = user_ws_rx.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                warn!("websocket error(uid={}): {}", my_id, e);
                break;
            }
        };
        user_msg_recieved(my_id, code.clone(), msg, rooms_arc.clone()).await;
    }

    // user_ws_rx stream will keep processing as long as the user stays
    // connected. Once they disconnect, then...
    user_disconnected(my_id, code, rooms_arc.clone(), cleaner.clone()).await;
}

async fn user_disconnected(my_id: usize, code: String, rooms_arc: Rooms, cleaner: RoomCleaner) {
    info!("Deleting user {} from room {}", my_id, code);
    // Scope is needed in order to manage to mutex lifetime on rooms
    let room_is_empty = {
        let mut rooms = rooms_arc.lock().await;
        let room = rooms.get_mut(&code).unwrap();

        // Send disconnected message to rest of users
        let msg = Messages::Disconnected { 
            id: my_id,
        };
        let msg_s = serde_json::to_string(&msg).unwrap();

        for user in room.users_by_id.values() {
            if user.user_data.id != my_id {
                let tx = &user.sender;
                let _ = tx.send(Ok(Message::text(&msg_s)));
            }
        }
        room.remove_user(&my_id);
        room.users_by_id.is_empty()
    };

    if room_is_empty {
        info!("Room {} is empty", code);
        delete_from_rooms(rooms_arc.clone(), cleaner.clone(), code).await;
    }
}

pub async fn delete_from_rooms(rooms: Rooms, cleaner: RoomCleaner, code: String) {
    let (abort_handle, abort_registration) = AbortHandle::new_pair();
    // Small scope to limit the mutex
    {
        let mut cleaner = cleaner.lock().await;
        cleaner.insert(code.clone(), abort_handle);
    }
    let future = Abortable::new(async { 
        time::delay_for(time::Duration::from_secs(ROOM_DELETION_TIMEOUT)).await;
        info!("Room {} has been empty for {}s, deleting it", code, ROOM_DELETION_TIMEOUT);
        let mut rooms = rooms.lock().await;

        if rooms.contains_key(&code) {
            rooms.remove(&code);
            debug!("Number of rooms = {:?}", rooms.len());
        }
        let mut cleaner = cleaner.lock().await;
        cleaner.remove(&code);
    }, abort_registration);

    match future.await {
        Ok(_) => (),
        Err(e) => warn!("Error with delete room future: {:?}", e),
    };
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
                Messages::Stats{name: n, time: t, player_state: p, director: is_director} => {
                    // let mut user: User = room.users_by_id.get_mut(&my_id);
                    if is_director {
                        room.director = Some(n.clone());
                    }

                    if let Some(mut user) = room.users_by_id.get_mut(&my_id) {
                        user.user_data.name = n;
                        user.user_data.time = t;
                        user.user_data.state = p;
                        user.user_data.director = is_director;
                    }
                },

                // If a users requests the stats, send them to that user only.
                Messages::RequestStats => {
                    let stats: Vec<StatsStruct> = room.users_by_id.values().map(|s| s.user_data.to_stats_struct()).collect();
                    let resp = Messages::StatsResponses{director: room.director.as_deref(), responses: stats};
                    let resp_str = serde_json::to_string(&resp).unwrap();
                    let user = &room.users_by_id[&my_id];
                    let tx = &user.sender;
                    let _ = tx.send(Ok(Message::text(&resp_str)));
                }

                _ => {},
            };
        } else {
            error!("Error parsing message {}", msg);
            return;
        }
}