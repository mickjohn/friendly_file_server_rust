use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
#[serde(tag = "type")]
pub enum Messages<'a> {
    Play{name: String},
    Pause{name: String},
    Seeked{name: String, time: f64},
    Stats{name: String, time: f64},
    StatsResponse{name: &'a str, time: f64, id: usize},
    Disconnected{id: usize},
}