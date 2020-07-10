use super::models::{Hba, Sp};
use super::filters::Authenticated;
use std::collections::HashMap;
use std::path::PathBuf;
use warp::path::FullPath;
use url::form_urlencoded::parse;

pub fn decode_url(fp: &FullPath) -> String {
    parse(fp.as_str().as_bytes())
        .map(|(key, val)| [key, val].concat())
        .collect()
}

pub async fn render_index<'a>(_: Authenticated, sp: Sp, hba: Hba<'a>, fp: warp::path::FullPath) -> Result<impl warp::Reply, warp::Rejection> {
    let path_str = decode_url(&fp).replace("/browse/", "").replace("/", "\\");
    let path = PathBuf::from(&path_str);
    let sp = sp.lock().await;

    if sp.is_file(&path) {
        return Err(warp::reject())
    }

    let listing = sp.get_directory_listing(&path).unwrap();
    let mut data = HashMap::new();
    data.insert(String::from("listing"), listing);

    let render = hba.hba.lock().await
        .render("listing.html", &data)
        .unwrap_or_else(|err| err.to_string());
    Ok(warp::reply::html(render))
}


pub async fn render_cinema<'a>(_: Authenticated, sp: Sp, hba: Hba<'a>, fp: warp::path::FullPath) -> Result<impl warp::Reply, warp::Rejection> {
    println!("CINEMA!!!!!!!!");
    println!("FP = {:?}", fp);
    let path_str = decode_url(&fp).replace("/cinema/", "/browse/");
    let path = PathBuf::from(path_str.replace("/browse/", ""));
    let sp = sp.lock().await;
    println!("path = {:?}", path_str);

    if !sp.is_file(&path) {
        return Err(warp::reject())
    }

    let mut data = HashMap::new();
    data.insert("mp4_path", path_str);

    let render = hba.hba.lock().await
        .render("cinema.html", &data)
        .unwrap_or_else(|err| err.to_string());
    Ok(warp::reply::html(render))
}