use clap::{Arg, App, ArgMatches};

pub struct Config {
    pub ipaddr: [u8; 4],
    pub webport: u16,
    pub sktport: u16,
    pub sharedir: String,
    pub credsfile: String,
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
    
    let sharedir = matches
        .value_of("sharedir")
        .ok_or(String::from("Plase specift sharedir argument"))?
        .to_owned();

    Ok(Config {
        ipaddr,
        webport,
        sktport,
        sharedir,
        credsfile,
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