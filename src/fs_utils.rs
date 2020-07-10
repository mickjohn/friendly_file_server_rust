use std::path::{Path, PathBuf};
use std::fs;
use serde::Serialize;
use chrono::DateTime;
use chrono::offset::Utc;


pub struct ServePoint {
    root_path: PathBuf,
}

#[derive(Serialize, Debug, Clone)]
pub struct DirectoryListing {
    pub path: String,
    pub trail: Vec<(String, String)>,
    pub children: Vec<DirectoryEntry>,
}

#[derive(Serialize, Debug, Clone)]
pub struct DirectoryEntry {
    pub name: String,
    pub is_file: bool,
    pub is_dir: bool,
    pub mtime: String,
    pub size: String,
}

fn to_uri_path(p: &Path) -> String {
    let mut uri_path = String::from("/");
    for part in p.iter() {
        let s = part.to_str().unwrap();
        uri_path.push_str(s);
        uri_path.push('/');
    }
    uri_path
}

impl ServePoint {
    pub fn new(p: PathBuf) -> Self {
        match p.canonicalize() {
            Ok(root_path) => {
                if !p.exists() || !p.is_dir() {
                    panic!(format!("{:?} does not exist or is not a directory", p));
                }

                return Self {
                    root_path: root_path,
                }
            },
            _ => panic!("Could not canonicalise path"),
        };
    }

    /*
    Build a path by combining the requested path "p" with the root dir. This path is then normalised or 'canonicalised'
    in order to resolve links or '..'. Then it's check to make sure that it's still inside of the root directory. This
    is done by using the 'starts_with' function to ensure that the path starts with the root dir
    */
    fn is_subdir(&self, p: &Path) -> bool {
        if p == Path::new("") || p == Path::new("/") {
            return true
        }

        let complete_path: PathBuf = self.root_path.join(p);
        if complete_path == self.root_path {
            return false;
        }

        match complete_path.canonicalize() {
            Ok(path) => path.starts_with(&self.root_path),
            _ => false,
        }
    }

    pub fn is_file(&self, p: &Path) -> bool {
        if !self.is_subdir(p) {
            return false
        }

        let complete_path: PathBuf = [&self.root_path, p].iter().collect();
        match complete_path.canonicalize() {
            Ok(path) => return path.is_file(),
            _ => return false,
        }
    }

    fn create_trail(&self, p: &Path) -> Vec<(String, String)> {
        let mut trail = Vec::new();
        if !self.is_subdir(p) { return trail; }

        let complete_path: PathBuf = [&self.root_path, p].iter().collect();
        match complete_path.canonicalize() {
            Ok(pathbuf) => {
                let mut new_path = pathbuf.as_path();
                loop {
                    if new_path.parent().is_none() { break }
                    if !self.is_subdir(new_path) { break }
                    // If path has no parent then break the loop

                    let name = new_path.file_name().unwrap().to_str().unwrap();
                    let path = new_path.strip_prefix(&self.root_path).unwrap().to_str().unwrap();
                    if path == String::from("") { break }
                    new_path = new_path.parent().unwrap();
                    trail.push((path.to_owned(), name.to_owned()));
                }
            },
            _ => (),
        }


        trail.reverse();
        trail
    }

    /*
    Given a relative path, return the full path including the root
    */
    // pub fn get_full_path(&self, p: &Path) -> Option<PathBuf> {
    //     if !self.is_subdir(p) { return None; }
    //     let complete_path: PathBuf = [&self.root_path, p].iter().collect();
    //     if !complete_path.exists() { return None; }
    //     Some(complete_path)
    // }

    pub fn get_directory_listing(&self, p: &Path) -> Option<DirectoryListing> {
        if !self.is_subdir(p) { return None; }

        // If the path is empty then don't bother appending it to the root
        let complete_path: PathBuf = if p == Path::new("") || p == Path::new("/") {
            [&self.root_path].iter().collect()
        } else {
            [&self.root_path, p].iter().collect()
        };

        if !complete_path.exists() { return None; }
        if !complete_path.is_dir() { return None; }

        let mut dirlisting = DirectoryListing{
            path: to_uri_path(p),
            trail: self.create_trail(p),
            children: Vec::new(),
        };

        for entry in fs::read_dir(complete_path).unwrap() {
            let entry = entry.unwrap();
            let path: PathBuf = entry.path();
            let meta = path.metadata().unwrap();
            let mtime_sys = meta.accessed().unwrap();
            let mtime_chrono: DateTime<Utc> = mtime_sys.into();

            let size = if path.is_dir() {
                "-"
            } else {
                "1 GB"
            };

            let name: String = if path.is_dir() {
                let mut temp = path.file_name().unwrap().to_str().unwrap().to_owned();
                temp.push('/');
                temp
            } else {
                path.file_name().unwrap().to_str().unwrap().to_owned() 
            };

            let dir_entry = DirectoryEntry {
                name: name,
                is_file: path.is_file(),
                is_dir: path.is_dir(),
                mtime: format!("{}", mtime_chrono.format("%d/%m/%Y %T")),
                size: size.to_owned(),
            };
            dirlisting.children.push(dir_entry)
        }
        Some(dirlisting)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::{Path, PathBuf};

    fn path_string_from_parts(parts: &[&str]) -> String {
       parts.iter().collect::<PathBuf>().to_str().unwrap().to_owned()
    }

    #[test]
    #[should_panic]
    fn test_new_serve_point_panics() {
        // Should panic
        let pb = PathBuf::from("/var/shaaaaaaaare");
        ServePoint::new(pb);
    }

    #[test]
    fn test_create_serve_point() {
        let pb = PathBuf::from(r"./src");
        ServePoint::new(pb);
    }

    #[test]
    fn test_is_subdir() {
        let root = PathBuf::from("test/testfolder");
        let sp = ServePoint::new(root);
        assert!(sp.is_subdir(Path::new("file1.abc")));
        assert!(sp.is_subdir(Path::new("folder1")));
        assert!(sp.is_subdir(&Path::new("folder1").join("file3.abc")));
        assert!(sp.is_subdir(Path::new("")));
        assert!(sp.is_subdir(Path::new("/")));


        let bad_folder: PathBuf = ["folder1", ".."].iter().collect();
        assert!( ! sp.is_subdir(&bad_folder));
    }

    #[test]
    fn test_is_file() {
        let root = PathBuf::from("test/testfolder");
        let sp = ServePoint::new(root);
        assert!(sp.is_file(Path::new("file1.abc")));
        assert!(sp.is_file(&Path::new("folder1").join(Path::new("file3.abc"))));

        assert!( ! sp.is_file(Path::new("folder1")));
        assert!( ! sp.is_file(Path::new("fdsfdf")));
    }

    #[test]
    fn test_create_trail() {
        let root = PathBuf::from("test/testfolder");
        let sp = ServePoint::new(root);

        let path: PathBuf = ["folder1", "mytestfiles", "testfile1.txt"].iter().collect();
        let trail = sp.create_trail(&path);

        let expected_trail = vec![
            (path_string_from_parts(&["folder1"]), "folder1".to_owned()),
            (path_string_from_parts(&["folder1", "mytestfiles"]), "mytestfiles".to_owned()),
            (path_string_from_parts(&["folder1", "mytestfiles", "testfile1.txt"]), "testfile1.txt".to_owned()),
        ];
        
        assert_eq!(expected_trail, trail);
    }

    // #[test]
    // fn test_get_full_path() {
    //     let root = PathBuf::from("test/testfolder");
    //     let sp = ServePoint::new(root);

    //     let path1 = Path::new("file1.abc");
    //     let expected1: PathBuf = ["test", "testfolder", "file1.abc"].iter().collect();
    //     assert_eq!(sp.get_full_path(path1).unwrap(), expected1.canonicalize().unwrap());

    //     let path2 = Path::new("folder1").join("mytestfiles").join("testfile1.txt");
    //     let expected2: PathBuf = ["test", "testfolder", "folder1", "mytestfiles", "testfile1.txt"].iter().collect();
    //     assert_eq!(sp.get_full_path(&path2).unwrap(), expected2.canonicalize().unwrap());

    //     let bad_path = Path::new("folder1").join("..").join("..");
    //     assert_eq!(sp.get_full_path(&bad_path), None);

    //     let doesnt_exist = Path::new("folder1").join("woooooooo");
    //     assert_eq!(sp.get_full_path(&doesnt_exist), None);
    // }

    #[test]
    fn test_get_directory_listing() {
        let root = PathBuf::from("test/testfolder");
        let sp = ServePoint::new(root);
        let path1 = Path::new("");
        let listing1 = sp.get_directory_listing(path1);
        println!("{:?}", listing1);
        // assert!(false);
    }
}