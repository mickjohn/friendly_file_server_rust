use tokio_postgres::{Client, Row};
use tokio_postgres::types::Json;
use tokio_postgres::types::FromSql;
use crate::db_models;


fn get_from_row<'a, T: FromSql<'a>>(row: &'a Row, key: &str) -> Result<T, String> {
    let v = row.try_get(key).map_err(|e| format!("Error retrieving column '{}'. Error = '{}'", key, e))?;
    Ok(v)
}

pub async fn get_catalogue(client: &Client) -> Result<db_models::DbCatalogue, String> {
    Ok(db_models::DbCatalogue {
        movies: get_movies(client).await?,
        tvshows: get_tvshows(client).await?,
    })
}

pub async fn get_movies(client: &Client) -> Result<Vec<db_models::DbMovie>, String> {
    let query = "
        SELECT json_agg(json_build_object('id', m.mid, 'title', m.title, 'description', m.description, 'url', m.url, 'year', m.year)) AS movies_json
        FROM movies m;";

    let rows = client.query(query, &[]).await.map_err(|e| format!("DB Error {}", e))?;
    if rows.len() > 1 {
        return Err(String::from("Movies query returned more than one row."));
    } else if rows.is_empty() {
        return Err(String::from("Movies query returned no rows."));
    }
    let row = &rows[0];
    let movies_json: Json<Vec<db_models::DbMovie>> = get_from_row(row, "movies_json")?;
    Ok(movies_json.0)
}

pub async fn get_tvshows(client: &Client) -> Result<Vec<db_models::DbTvShow>, String> {
    let query = "
        SELECT json_agg(json_build_object('id', t.tid, 'title', t.title, 'description', t.description, 'seasons', seasons_j)) AS tvshows_json
        FROM (
            SELECT * FROM tvshows t
            LEFT JOIN (
                SELECT seasons.tid AS s_tid, json_agg(json_build_object('id', seasons.sid, 'num', seasons.num, 'title', seasons.title, 'episodes', episodes_json)) AS seasons_j
                FROM (
                    SELECT * FROM seasons
                    LEFT JOIN (
                        SELECT e.sid AS e_sid, json_agg(json_build_object('id', e.eid, 'title', e.title, 'url', e.url, 'num', e.num)) AS episodes_json
                        FROM episodes e
                        GROUP BY e.sid
                    ) eps ON eps.e_sid = seasons.sid
                    ORDER BY seasons.num
                ) seasons
                GROUP BY seasons.tid
            ) se ON se.s_tid = t.tid
        ) t;";
    let rows = client.query(query, &[]).await.map_err(|e| format!("DB Error {}", e))?;
    if rows.len() > 1 {
        return Err(String::from("TV show query returned more than one row."));
    } else if rows.is_empty() {
        return Err(String::from("TV show query returned no rows."));
    }
    let row = &rows[0];
    let tvshows_json: Json<Vec<db_models::DbTvShow>> = get_from_row(row, "tvshows_json")?;
    Ok(tvshows_json.0)
}