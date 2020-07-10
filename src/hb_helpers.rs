use handlebars::Handlebars;
use handlebars::{RenderContext, Helper, Context, JsonRender, HelperResult, Output};
use std::collections::HashMap;
use serde_json::value::Value;
use url::form_urlencoded::byte_serialize;


lazy_static! {
    static ref EXT_ICON_MAP: HashMap<&'static str, &'static str> = {
        let mut m = HashMap::new();
        m.insert("default", "blank_file_icon.svg");
        m.insert("jpg", "picture_file_icon.svg");
        m.insert("jpeg", "picture_file_icon.svg");
        m.insert("gif", "picture_file_icon.svg");
        m.insert("png", "picture_file_icon.svg");
        m.insert("bmp", "picture_file_icon.svg");
        m.insert("pdf", "text_file_icon.svg");
        m.insert("docx", "text_file_icon.svg");
        m.insert("doc", "text_file_icon.svg");
        m.insert("txt", "text_file_icon.svg");
        m.insert("srt", "text_file_icon.svg");
        m
    };
}

pub const LISTING_TEMPLATE: &'static str = include_str!("../templates/listing.html.hb");
pub const CINEMA_TEMPLATE: &'static str = include_str!("../templates/cinema.html.hb");

/*
If given a json string that ends in ".mp4" reutrn true
Otherwise return an empty string (which will evaluate to false)
*/
pub fn is_mp4(h: &Helper, _: &Handlebars, _: &Context, _: &mut RenderContext, out: &mut dyn Output) -> HelperResult {
    let param = h.param(0).unwrap();
    match param.value() {
        Value::String(s) => {
            let value = if s.ends_with(".mp4") {
                Value::Bool(true)
            } else {
                Value::String("".to_owned())
            };
            out.write(value.render().as_ref())?;
        },
        _ => {
            out.write(Value::String("".to_owned()).render().as_ref())?;
        }
    };

    Ok(())
}


pub fn urlencode(h: &Helper, _: &Handlebars, _: &Context, _: &mut RenderContext, out: &mut dyn Output) -> HelperResult {
    let param = h.param(0).unwrap();
    match param.value() {
        Value::String(s) => {
            let urlencoded: String = byte_serialize(s.as_bytes()).collect();
            let value = Value::String(urlencoded);
            out.write(value.render().as_ref())?;
        },
        _ => {}
    };
    Ok(())
}

/*
Look at the extenstion for a filename and find an appropiate file icon
*/
pub fn icon_for_ext(h: &Helper, _: &Handlebars, _: &Context, _: &mut RenderContext, out: &mut dyn Output) -> HelperResult {
    let param = h.param(0).unwrap();
    match param.value() {
        Value::String(s) => {
            let parts = s.split(".").collect::<Vec<&str>>();

            // Get the extension of the string name
            if let Some(ext) = parts.last() {
                // Lookup the icon in the map, and return it's name
                if let Some(icon) = EXT_ICON_MAP.get(ext) {
                    let s: String = (*icon).to_owned();
                    out.write(Value::String(s).render().as_ref())?;
                } else {
                    let icon = String::from("blank_file_icon.svg");
                    out.write(Value::String(icon).render().as_ref())?;
                }
                return Ok(())
            }
            out.write(Value::String("".to_owned()).render().as_ref())?;
        },
        _ => {
            out.write(Value::String("".to_owned()).render().as_ref())?;
        }
    };

    Ok(())
}