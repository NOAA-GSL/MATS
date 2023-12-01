SELECT m.mhod AS hr_of_day,
       ARRAY_MIN(stats[*].fve) AS min_secs,
       ARRAY_MAX(stats[*].fve) AS max_secs,
       ARRAY_SUM(stats[*].hit) AS hits,
       ARRAY_SUM(stats[*].miss) AS misses,
       ARRAY_SUM(stats[*].false_alarm) AS fa,
       ARRAY_SUM(stats[*].correct_negative) AS cn,
       ARRAY_SUM(stats[*].total) AS N0,
       ARRAY_COUNT(ARRAY_DISTINCT(stats[*].fve)) AS N_times,
       ARRAY_SORT(stats[*].sub) AS sub_data
FROM (
    SELECT sdu.ohod AS ohod,
           ARRAY_AGG(sdu) AS data
    FROM (
        SELECT stationData
        FROM `vxdata`._default.METAR AS obs
        LET ofve = obs.fcstValidEpoch,
            stationData_tmp = ARRAY OBJECT_ADD(d, 'ofve', ofve ) FOR d IN ( [obs.data.KEWR, obs.data.KJFK, obs.data.KJRB] ) END,
            stationData = ARRAY OBJECT_ADD(d, 'ohod', ofve%(24*3600)/3600 ) FOR d IN ( stationData_tmp ) END
        WHERE type = "DD"
            AND docType = "obs"
            AND version = "V01"
            AND obs.fcstValidEpoch BETWEEN 1662249600 AND 1664841600 ) sd
    UNNEST sd.stationData sdu
    GROUP BY sdu.ohod
    ORDER BY sdu.ohod) o,
(
    SELECT sdu.mhod AS mhod,
           ARRAY_AGG(sdu) AS data
    FROM (
        SELECT modelData
        FROM `vxdata`._default.METAR AS models
        LET mfve = models.fcstValidEpoch,
            modelData_tmp = ARRAY OBJECT_ADD(d, 'mfve', mfve ) FOR d IN ( [models.data.KEWR, models.data.KJFK, models.data.KJRB] ) END,
            modelData = ARRAY OBJECT_ADD(d, 'mhod', mfve%(24*3600)/3600 ) FOR d IN ( modelData_tmp ) END
        WHERE type = "DD"
            AND docType = "model"
            AND model = "HRRR_OPS"
            AND fcstLen = 6
            AND version = "V01"
            AND models.fcstValidEpoch BETWEEN 1662249600 AND 1664841600) sd
    UNNEST sd.modelData sdu
    GROUP BY sdu.mhod
    ORDER BY sdu.mhod) m
LET stats = ARRAY( FIRST { 'hit' :CASE WHEN mv.Ceiling < 3000.0
        AND ov.Ceiling < 3000.0 THEN 1 ELSE 0 END,
                                          'miss' :CASE WHEN NOT mv.Ceiling < 3000.0
        AND ov.Ceiling < 3000.0 THEN 1 ELSE 0 END,
                                          'false_alarm' :CASE WHEN mv.Ceiling < 3000.0
        AND NOT ov.Ceiling < 3000.0 THEN 1 ELSE 0 END,
                                              'correct_negative' :CASE WHEN NOT mv.Ceiling < 3000.0
        AND NOT ov.Ceiling < 3000.0 THEN 1 ELSE 0 END,
                                              'total' :CASE WHEN mv.Ceiling IS NOT MISSING
        AND ov.Ceiling IS NOT MISSING THEN 1 ELSE 0 END,
                                                'fve': mv.mfve,
                                                'hr_of_day': mv.mhod,
                                                'sub': TO_STRING(mv.mfve) || ';' || CASE WHEN mv.Ceiling < 3000.0
        AND ov.Ceiling < 3000.0 THEN '1' ELSE '0' END || ';' || CASE WHEN mv.Ceiling < 3000.0
        AND NOT ov.Ceiling < 3000.0 THEN '1' ELSE '0' END || ';' || CASE WHEN NOT mv.Ceiling < 3000.0
        AND ov.Ceiling < 3000.0 THEN '1' ELSE '0' END || ';' || CASE WHEN NOT mv.Ceiling < 3000.0
        AND NOT ov.Ceiling < 3000.0 THEN '1' ELSE '0' END } FOR ov IN o.data WHEN ov.ofve = mv.mfve
        AND ov.name = mv.name END ) FOR mv IN m.data END
WHERE m.mhod = o.ohod