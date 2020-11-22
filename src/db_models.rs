use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct DbCatalogue {
    pub movies: Vec<DbMovie>,
    pub tvshows: Vec<DbTvShow>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DbMovie {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub url: String,
    pub year: i64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DbEpisode {
    pub id: i64,
    pub num: i64,
    pub url: String,
    pub title: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DbSeason{
    pub id: i64,
    pub num: i64,
    pub title: String,
    pub episodes: Vec<DbEpisode>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DbTvShow {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub seasons: Vec<DbSeason>,
}