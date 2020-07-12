use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
#[serde(tag = "type")]
pub enum Messages {
    Play{name: String},
    Pause{name: String},
    Seeked{name: String, time: f64},
    Stats{name: String, time: f64},
    Disconnected{id: usize, name: String},
}