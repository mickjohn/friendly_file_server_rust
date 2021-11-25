use clap::{Arg, App, ArgMatches};
use serde::Deserialize;
use std::path::Path;
use std::collections::HashMap;
use std::fs;

use crate::webserver::models::{AuthenticatedUser, UserRole};

/*
Config is loaded from JSON file first, those values are used as defaults for
the rest of the command line arguments.

i.e. use config file for defaults and overwrite using CLI args.
*/

pub struct Config {
    pub ipaddr: [u8; 4],
    pub port: u16,
    pub sharedir: String,
    pub users: HashMap<String, AuthenticatedUser>,
    pub db_url: String,
    pub check_password: bool,
    pub encrypt_password: bool,
}

#[derive(Deserialize, Debug)]
struct JsonConfig {
    pub ipaddr: Option<String>,
    pub port: Option<u16>,
    pub sharedir: Option<String>,
    pub users_file: Option<String>,
    pub db_url: Option<String>,
}

impl Default for JsonConfig {
    fn default() -> Self {
        JsonConfig{
            ipaddr: None,
            port: None,
            sharedir: None,
            users_file: None,
            db_url: None,
        }
    }
}

#[derive(Debug)]
struct CliConfig {
    pub ipaddr: Option<String>,
    pub port: Option<u16>,
    pub sharedir: Option<String>,
    pub users_file: Option<String>,
    pub config_file: Option<String>,
    pub db_url: Option<String>,
    pub check_password: bool,
    pub encrypt_password: bool,
}

fn parse_args<'a>() -> ArgMatches<'a> {
    App::new("Friendly File Server")
    .version("1.0")
    .about("Friendly file server")
    .arg(Arg::with_name("ipaddr")
         .long("ipaddr")
         .help("IP address to bind to")
         .default_value("127.0.0.1")
         .required(false)
         .takes_value(true))
    .arg(Arg::with_name("port")
         .long("port")
         .help("The HTTP webserver port to listen to")
         .default_value("5000")
         .required(false)
         .takes_value(true))
    .arg(Arg::with_name("sharedir")
         .long("sharedir")
         .help("The directory to server files from")
         .required(false)
         .takes_value(true))
    .arg(Arg::with_name("credsfile")
         .long("credsfile")
         .help("The file containing the credentials")
         .required(false)
         .takes_value(true))
    .arg(Arg::with_name("dburl")
         .long("dburl")
         .help("The DB url")
         .required(false)
         .takes_value(true))
    .arg(Arg::with_name("config")
        .long("config")
        .help("path to config file")
        .required(false)
        .takes_value(true))
    .arg(Arg::with_name("encrypt_password")
        .long("encrypt_password")
        .help("Use this to encrypt a password and see the ciphertext")
        .required(false)
        .takes_value(false))
    .arg(Arg::with_name("check_password")
        .long("check_password")
        .help("Use this to verify a password against it's hash")
        .required(false)
        .takes_value(false))
    .get_matches()
}

fn parse_config_from_json_file(p: &Path) -> Result<JsonConfig, String> {
    let content = fs::read_to_string(p).map_err(|e| format!("{:?}", e))?;
    let json_config: JsonConfig = serde_json::from_str(&content).map_err(|e| format!("{:?}", e))?;
    Ok(json_config)
}

fn parse_config_from_args() -> Result<CliConfig, String> {
    let matches = parse_args();

    let ipaddr_str = matches.value_of("ipaddr").map(|s| s.to_owned());

    let db_url = matches.value_of("dburl").map(|s| s.to_owned());

    let mut port = None;
    if let Some(p) = matches.value_of("port").map(|p| p.parse::<u16>()) {
        port = Some(p.map_err(|e| format!("{}", e))?);
    }

    let credsfile = matches.value_of("credsfile").map(|c| c.to_owned());

    let sharedir = matches
        .value_of("sharedir")
        .map(|s| s.to_owned());

    let config_file = matches
        .value_of("config")
        .map(|s| s.to_owned());

    Ok(CliConfig {
        ipaddr: ipaddr_str,
        port: port,
        sharedir: sharedir,
        users_file: credsfile,
        config_file: config_file,
        db_url: db_url,
        encrypt_password: matches.is_present("encrypt_password"),
        check_password: matches.is_present("check_password"),
    })
}

pub fn load_config() -> Result<Config, String> {
    let cli_conf = parse_config_from_args()?;
    debug!("CLI args = {:?}", cli_conf);
    let mut json_config = JsonConfig::default();

    // Load the config file if it has been specified
    if let Some(config_file) = &cli_conf.config_file {
        let p = Path::new(config_file);
        debug!("Loading config from {}", config_file);
        json_config = parse_config_from_json_file(&p)?;
        debug!("JSON config = {:?}", json_config);
    }

    // If we are just checking password then default everything and return
    // a useless config. The app will be exiting once it checks or encrypts the
    // passwords.
    if cli_conf.check_password | cli_conf.encrypt_password {
        return Ok(Config {
            ipaddr: [0,0,0,0],
            port: 0,
            sharedir: String::from(""),
            users: HashMap::new(),
            db_url: String::from(""),
            check_password: cli_conf.check_password,
            encrypt_password: cli_conf.encrypt_password,
        })
    }

    // Merge the values from the json conf and CLI arg
    let ipaddr_str = cli_conf.ipaddr.or(json_config.ipaddr).ok_or("Please specify IP address.")?;
    // let db_url = cli_conf.db_url.or(json_config.db_url).ok_or("Please specify DB url")?;
    let db_url = String::new();
    let port = cli_conf.port.or(json_config.port).ok_or("Please specify port.")?;
    let sharedir = cli_conf.sharedir.or(json_config.sharedir).ok_or("Please specify Share Dir.")?;
    let users_file = cli_conf.users_file.or(json_config.users_file).ok_or("Please specpfy Users File.")?;

    // Do some further processing on some of the args
    let users_file_contents = fs::read_to_string(&users_file).map_err(|e| format!("{}", e))?;
    let users = load_users_from_str(&users_file_contents)?;
    let ipaddr = validate_ip_addr(&ipaddr_str)?;

    Ok(Config { ipaddr, port, sharedir, users, db_url, check_password: cli_conf.check_password, encrypt_password: cli_conf.encrypt_password })
}

fn validate_ip_addr(ipaddr: &str) -> Result<[u8; 4], String> {
    let parts: Vec<&str> = ipaddr.split(".").collect();
    let mut octet_array: [u8; 4] = [0,0,0,0];
    if parts.len() != 4 {
        Err(String::from("Incorrect IP address format"))?;
    }

    for (i, part) in parts.iter().enumerate() {
        let octet: u8 = part.parse().map_err(|e| format!("{}", e))?;
        octet_array[i] = octet;
    }
    Ok(octet_array)
}

fn load_users_from_str(contents: &str) -> Result<HashMap<String, AuthenticatedUser>, String> {
    let mut users = HashMap::new();
    for line in contents.split("\n") {
        let line = line.trim();
        if !line.starts_with(";") && line != "" {
            let parts: Vec<&str> = line.split(" ").collect();
            if !(parts.len() == 2 || parts.len() == 3) {
                return Err(String::from("Error reading credentials file."));
            }

            let username = parts[0].trim().to_owned();
            let password = parts[1].trim().to_owned();
            let role = parts.get(2).map(|r| match r.trim() {
                "ReadOnly" => UserRole::ReadOnly,
                "Uploader" => UserRole::Uploader,
                "Admin" => UserRole::Admin,
                _ => UserRole::ReadOnly,
            }).unwrap_or(UserRole::ReadOnly);

            let user = AuthenticatedUser { 
                username: username.clone(),
                role,
                password 
            };

            users.insert(username, user);
        }
    }
    Ok(users)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_ip_addr() {
        let data: Vec<(&str, Result<[u8; 4], String>)> = vec![
            ("192.168.1.1", Ok([192, 168, 1, 1])),
            ("0.0.0.0", Ok([0, 0, 0, 0])),
            ("1.2.3", Err(String::from("Incorrect IP address format"))),
            ("one.two.three.four", Err(String::from("invalid digit found in string"))),
        ];

        for (ip_str, outcome) in data {
            assert_eq!(validate_ip_addr(ip_str), outcome);
        }
    }

    #[test]
    fn test_load_users_from_str1() {
        let good_str  = concat!(
            "; Users file\n",
            "username1 pass1\n",
            "username2 pass2\n",
            "username3 pass3 ReadOnly\n",
            "username4 pass4 Admin\n",
            "username5 pass5 Uploader\n",
            "username6 pass6 QwErTy\n",
        );

        let mut expected_usernames = HashMap::new();
        let users = vec![
            AuthenticatedUser::new(String::from("username1"), String::from("pass1"), UserRole::ReadOnly),
            AuthenticatedUser::new(String::from("username2"), String::from("pass2"), UserRole::ReadOnly),
            AuthenticatedUser::new(String::from("username3"), String::from("pass3"), UserRole::ReadOnly),
            AuthenticatedUser::new(String::from("username4"), String::from("pass4"), UserRole::Admin),
            AuthenticatedUser::new(String::from("username5"), String::from("pass5"), UserRole::Uploader),
            AuthenticatedUser::new(String::from("username6"), String::from("pass6"), UserRole::ReadOnly),
        ];
        for user in users {
            expected_usernames.insert(user.username.clone(), user.clone());
        }

        assert_eq!(load_users_from_str(good_str), Ok(expected_usernames));

        let bad_str = "; Users file\nuser space pass rubbish";
        assert_eq!(load_users_from_str(bad_str), Err(String::from("Error reading credentials file.")));
    }

}