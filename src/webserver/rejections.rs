use warp;

#[derive(Debug)]
pub struct InvalidCredentials;
impl warp::reject::Reject for InvalidCredentials {}

#[derive(Debug)]
pub struct NotADirectory;
impl warp::reject::Reject for NotADirectory {}

#[derive(Debug)]
pub struct NotAFile;
impl warp::reject::Reject for NotAFile {}