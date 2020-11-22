/**************************************************/
/* SELECT ALL TVSHOWS AND SEASONS, RETURN AS JSON */
/**************************************************/
SELECT t.tid, json_agg(json_build_object('t_id', t.tid, 't_title', t.title, 't_description', t.description, 'seasons', seasons_j))
FROM (
	SELECT * FROM tvshows t
	LEFT JOIN (
		SELECT s.tid AS s_tid, json_agg(json_build_object('s_id', s.sid, 's_title', s.title, 's_num', s.num)) AS seasons_j 
		FROM seasons s
		GROUP BY s.tid
	) se ON se.s_tid = t.tid
) t
GROUP BY t.tid;

/**************************************************/
/* SELECT ALL SEASONS AND EPISODES, RETURN AS JSON*/
/**************************************************/
SELECT seasons.sid, json_agg(json_build_object('s_id', seasons.sid, 's_title', seasons.title, 'episodes', episodes_json))
FROM (
	SELECT * FROM seasons
	LEFT JOIN (
		SELECT e.sid AS e_sid, json_agg(json_build_object('e_id', e.eid, 'e_title', e.title, 'e_num', e.num)) AS episodes_json
		FROM episodes e
		GROUP BY e.sid
	) eps ON eps.e_sid = seasons.sid
) seasons
GROUP BY seasons.sid;

/***********************************************************/
/* SELECT ALL TVSHOWS, SEASONS AND EPISODES, RETURN AS JSON*/
/***********************************************************/
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
) t;


/************************************/
/* SELECT ALL MOVIES, RETURN AS JSON*/
/************************************/
SELECT json_agg(json_build_object('id', m.mid, 'title', m.title, 'description', m.description, 'url', m.url, 'year', m.year)) AS movies_json
FROM movies m;
