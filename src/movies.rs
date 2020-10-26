use serde::{Deserialize, Serialize};
use serde_json;
use std::fs;
use std::path::Path;

pub fn load_catalogue_from_file(path: &Path) -> Result<Catalogue, String> {
    let contents = fs::read_to_string(path).map_err(|e| format!("{}", e))?;
    let catalogue: Catalogue = serde_json::from_str(&contents).map_err(|e| format!("{}", e))?;
    Ok(catalogue)
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Catalogue {
    pub movies: Vec<Movie>,
    pub tvshows: Vec<TvShow>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Movie {
    pub url: String,
    pub title: String,
    pub year: Option<u16>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TvShow {
    pub title: String,
    pub description: String,
    pub seasons: Vec<Season>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Season {
    pub title: String,
    pub episodes: Vec<Episode>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Episode {
    pub url: String,
    pub title: String,
    pub number: u16,
}