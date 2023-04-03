SELECT m.name AS sta_id,
       ARRAY_MIN(stats[*].fve) AS min_secs,
       ARRAY_MAX(stats[*].fve) AS max_secs,
       ARRAY_SUM(stats [*].hit) AS hits,
       ARRAY_SUM(stats [*].miss) AS misses,
       ARRAY_SUM(stats [*].false_alarm) AS fa,
       ARRAY_SUM(stats [*].correct_negative) AS cn,
       ARRAY_SUM(stats [*].total) AS N0,
       ARRAY_COUNT(ARRAY_DISTINCT(stats[*].fve)) AS N_times,
       ARRAY_SORT(stats[*].sub) AS sub_data
FROM (
    SELECT sdu.name AS name,
           ARRAY_AGG(sdu) AS data
    FROM (
        SELECT stationData
        FROM vxdata._default.METAR AS obs
        LET ofve = obs.fcstValidEpoch,
            stationData = ARRAY OBJECT_ADD(d, 'ofve', ofve ) FOR d IN ( [obs.data.KEWR,obs.data.KJFK,obs.data.KJRB] ) END
        WHERE type = "DD"
            AND docType = "obs"
            AND version = "V01"
            AND obs.fcstValidEpoch BETWEEN 1662310800 AND 1664902800 ) sd
    UNNEST sd.stationData sdu
    GROUP BY sdu.name
    ORDER BY sdu.name) o,
(
    SELECT sdu.name AS name,
           ARRAY_AGG(sdu) AS data
    FROM (
        SELECT modelData
        FROM vxdata._default.METAR AS models
        LET mfve = models.fcstValidEpoch,
            modelData = ARRAY OBJECT_ADD(d, 'mfve', mfve ) FOR d IN ( [models.data.KEWR,models.data.KJFK,models.data.KJRB] ) END
        WHERE type = "DD"
            AND docType = "model"
            AND model = "HRRR_OPS"
            AND fcstLen = 6
            AND version = "V01"
            AND models.fcstValidEpoch BETWEEN 1662310800 AND 1664902800) sd
    UNNEST sd.modelData sdu
    GROUP BY sdu.name
    ORDER BY sdu.name) m
LET stats = ARRAY( FIRST { 'hit' :CASE WHEN mv.Ceiling < 500.0
        AND ov.Ceiling < 500.0 THEN 1 ELSE 0 END,
                                          'miss' :CASE WHEN NOT mv.Ceiling < 500.0
        AND ov.Ceiling < 500.0 THEN 1 ELSE 0 END,
                                          'false_alarm' :CASE WHEN mv.Ceiling < 500.0
        AND NOT ov.Ceiling < 500.0 THEN 1 ELSE 0 END,
                                              'correct_negative' :CASE WHEN NOT mv.Ceiling < 500.0
        AND NOT ov.Ceiling < 500.0 THEN 1 ELSE 0 END,
                                              'total' :CASE WHEN mv.Ceiling IS NOT MISSING
        AND ov.Ceiling IS NOT MISSING THEN 1 ELSE 0 END,
                                                'fve': mv.mfve,
                                                'sub': TO_STRING(mv.mfve) || ';' || CASE WHEN mv.Ceiling < 500.0
        AND ov.Ceiling < 500.0 THEN '1' ELSE '0' END || ';' || CASE WHEN mv.Ceiling < 500.0
        AND NOT ov.Ceiling < 500.0 THEN '1' ELSE '0' END || ';' || CASE WHEN NOT mv.Ceiling < 500.0
        AND ov.Ceiling < 500.0 THEN '1' ELSE '0' END || ';' || CASE WHEN NOT mv.Ceiling < 500.0
        AND NOT ov.Ceiling < 500.0 THEN '1' ELSE '0' END } FOR ov IN o.data WHEN ov.ofve = mv.mfve
        AND ov.name = mv.name END ) FOR mv IN m.data END
WHERE m.name = o.name
