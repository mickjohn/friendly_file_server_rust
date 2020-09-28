use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub enum PlayerState {
    Playing,
    Paused,
    Loading,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct StatsStruct<'a> {
    pub name: &'a str,
    pub time: f64,
    pub player_state: PlayerState,
    pub id: usize,
    pub director: bool,
}


#[derive(Deserialize, Serialize, Debug)]
#[serde(tag = "type")]
pub enum Messages<'a> {
    Play{name: String},
    Pause{name: String},
    Seeked{name: String, time: f64},
    Stats{name: String, time: f64, player_state: PlayerState, director: bool},
    StatsResponse{name: &'a str, time: f64, player_state: PlayerState, id: usize, director: bool},
    Disconnected{id: usize},
    RequestStats,
    StatsResponses{responses: Vec<StatsStruct<'a>>},
}