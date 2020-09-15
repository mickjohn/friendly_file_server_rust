use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub enum PlayerState {
    Playing,
    Paused,
    Loading,
}


#[derive(Deserialize, Serialize, Debug)]
#[serde(tag = "type")]
pub enum Messages<'a> {
    Play{name: String},
    Pause{name: String},
    Seeked{name: String, time: f64},
    Stats{name: String, time: f64, player_state: PlayerState},
    StatsResponse{name: &'a str, time: f64, player_state: PlayerState, id: usize},
    Disconnected{id: usize},
}