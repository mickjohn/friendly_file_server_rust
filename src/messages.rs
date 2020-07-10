
pub enum Messages {
    Play,
    Pause,
    Seeked{time: String},
    Stats{time: String},
    Disconnected{user: String},
}