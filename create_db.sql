
CREATE TABLE IF NOT EXISTS movies (
    mid         SERIAL PRIMARY KEY,
    title       varchar(200),
    url         varchar(200),
    description varchar(3000),
    year        integer
);

CREATE TABLE IF NOT EXISTS tvshows (
    tid         SERIAL PRIMARY KEY,
    title       varchar(200),
    description varchar(3000)
);

CREATE TABLE IF NOT EXISTS seasons (
    sid         SERIAL PRIMARY KEY,
    num         integer,
    title       varchar(200),
    tid         integer,
    CONSTRAINT fk_tid FOREIGN KEY(tid) REFERENCES tvshows(tid)
);

CREATE TABLE IF NOT EXISTS episodes (
    eid         SERIAL PRIMARY KEY,
    num         integer,
    title       varchar(200),
    url         varchar(200),
    sid         integer,
    CONSTRAINT fk_sid FOREIGN KEY(sid) REFERENCES seasons(sid)
);


INSERT INTO movies (title, url, description, year) VALUES ('Terminator Two', 'http://...', 'A cybord does something', 1991);
INSERT INTO movies (title, url, description, year) VALUES ('Police Acadamy', 'http://...', 'funny cops', 1986);

INSERT INTO tvshows(title, description) VALUES ('Father Ted', 'A Priest exists');
INSERT INTO seasons(title, num, tid) VALUES ('Season 1', 1, 1);
INSERT INTO episodes(title, num, url, sid) VALUES ('Episode One', 1, 'http://google.com', 1);

INSERT INTO tvshows(title, description) VALUES ('The Simsons', 'Homer HAHA');
INSERT INTO seasons(title, num, tid) VALUES ('Season 7', 7, 2);
INSERT INTO seasons(title, num, tid) VALUES ('Season 6', 6, 2);
INSERT INTO episodes(title, num, url, sid) VALUES ('Bart of Darkness', 1, 'http://google.com', 3);
INSERT INTO episodes(title, num, url, sid) VALUES ('Another Simpsons Clip Show', 3, 'http://google.com', 3);
INSERT INTO episodes(title, num, url, sid) VALUES ('Who Shot Mr. Burns (Part 2)', 1, 'http://google.com', 2);
INSERT INTO episodes(title, num, url, sid) VALUES ('Readioactive Man', 2, 'http://google.com', 2);
INSERT INTO episodes(title, num, url, sid) VALUES ('Lisas Rival', 2, 'http://google.com', 3);
INSERT INTO episodes(title, num, url, sid) VALUES ('Home Sweet Home-Diddly-Dum-Doodily', 3, 'http://google.com', 2);
INSERT INTO episodes(title, num, url, sid) VALUES ('Episode Two', 2, 'http://google.com', 1);
INSERT INTO episodes(title, num, url, sid) VALUES ('Episode Three', 3, 'http://google.com', 1);