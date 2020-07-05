use clap::{Arg, App, ArgMatches};
use std::path::Path;
use std::collections::HashMap;
use std::fs;

pub struct Config {
    pub ipaddr: [u8; 4],
    pub webport: u16,
    pub sktport: u16,
    pub sharedir: String,
    pub users: HashMap<String, String>,
}

fn parse_args<'a>() -> ArgMatches<'a> {
    App::new("Friendly File Server")
    .version("1.0")
    .about("Friendly file server")
    .arg(Arg::with_name("ipaddr")
         .long("ipaddr")
         .help("IP address to bind to")
         .default_value("127.0.0.1")
         .takes_value(true))
    .arg(Arg::with_name("webport")
         .long("webport")
         .help("The HTTP webserver port to listen to")
         .default_value("5000")
         .takes_value(true))
    .arg(Arg::with_name("sktport")
         .long("sktport")
         .help("the websocket port to bind to")
         .default_value("5001")
         .takes_value(true))
    .arg(Arg::with_name("sharedir")
         .long("sharedir")
         .help("The directory to server files from")
         .takes_value(true))
    .arg(Arg::with_name("credsfile")
         .long("credsfile")
         .help("The file containing the credentials")
         .takes_value(true))
    .get_matches()
}

pub fn parse_config_from_args() -> Result<Config, String> {
    let matches = parse_args();

    /* Safe to use unwrap because they have a default value */
    let ipaddr_str = matches.value_of("ipaddr").unwrap().to_owned();
    let ipaddr = validate_ip_addr(&ipaddr_str)?;

    let webport: u16 = matches
        .value_of("webport")
        .unwrap()
        .parse()
        .map_err(|e| format!("{}", e))?;

    let sktport: u16 = matches
        .value_of("sktport")
        .unwrap()
        .parse()
        .map_err(|e| format!("{}", e))?;

    let credsfile = matches
        .value_of("credsfile")
        .ok_or(String::from("Please specify credsfile"))?
        .to_owned();

    let credsfile_path = Path::new(&credsfile);
    let contents = fs::read_to_string(&credsfile_path).map_err(|e| format!("{}", e))?;
    let users = load_users_from_str(&contents)?;
    
    let sharedir = matches
        .value_of("sharedir")
        .ok_or(String::from("Plase specift sharedir argument"))?
        .to_owned();

    Ok(Config {
        ipaddr,
        webport,
        sktport,
        sharedir,
        users,
    })
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

fn load_users_from_str(contents: &str) -> Result<HashMap<String, String>, String> {
    let mut users = HashMap::new();
    for line in contents.split("\n") {
        if !line.starts_with(";") && line != "" {
            let parts: Vec<&str> = line.split(" ").collect();
            if parts.len() != 2 {
                return Err(String::from("Error reading credentials file."));
            }

            let username = parts[0].to_owned();
            let password = parts[1].to_owned();
            users.insert(username, password);
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
    fn test_load_users_from_str() {
        let good_str  = concat!(
            "; Users file\n",
            "username1 pass1\n",
            "username2 pass2\n",
        );

        let mut expected_usernames = HashMap::new();
        expected_usernames.insert(String::from("username1"), String::from("pass1"));
        expected_usernames.insert(String::from("username2"), String::from("pass2"));
        assert_eq!(load_users_from_str(good_str), Ok(expected_usernames));

        let bad_str = "; Users file\nuser space pass";
        assert_eq!(load_users_from_str(bad_str), Err(String::from("Error reading credentials file.")));
    }

}