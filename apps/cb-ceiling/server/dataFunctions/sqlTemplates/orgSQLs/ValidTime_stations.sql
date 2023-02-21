SELECT m0.fcstValidEpoch%(24*3600)/3600 AS hr_of_day,
       COUNT(DISTINCT m0.fcstValidEpoch) N_times,
       MIN(m0.fcstValidEpoch) min_secs,
       MAX(m0.fcstValidEpoch) max_secs,
       SUM(CASE WHEN m0data.Ceiling < 500.0
               AND odata.Ceiling < 500.0 THEN 1 ELSE 0 END) AS hit,
       SUM(CASE WHEN m0data.Ceiling < 500.0
               AND NOT odata.Ceiling < 500.0 THEN 1 ELSE 0 END) AS fa,
       SUM(CASE WHEN NOT m0data.Ceiling < 500.0
               AND odata.Ceiling < 500.0 THEN 1 ELSE 0 END) AS miss,
       SUM(CASE WHEN NOT m0data.Ceiling < 500.0
               AND NOT odata.Ceiling < 500.0 THEN 1 ELSE 0 END) AS cn,
       SUM(CASE WHEN m0data.Ceiling IS NOT MISSING
               AND odata.Ceiling IS NOT MISSING THEN 1 ELSE 0 END) AS N0,
       ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || CASE WHEN m0data.Ceiling < 500.0
               AND odata.Ceiling < 500.0 THEN '1' ELSE '0' END || ';' || CASE WHEN m0data.Ceiling < 500.0
               AND NOT odata.Ceiling < 500.0 THEN '1' ELSE '0' END || ';' || CASE WHEN NOT m0data.Ceiling < 500.0
               AND odata.Ceiling < 500.0 THEN '1' ELSE '0' END || ';' || CASE WHEN NOT m0data.Ceiling < 500.0
               AND NOT odata.Ceiling < 500.0 THEN '1' ELSE '0' END) AS sub_data
FROM vxdata._default.METAR AS m0
    JOIN mdata AS o ON o.fcstValidEpoch = m0.fcstValidEpoch
UNNEST o.data AS odata
UNNEST m0.data AS m0data
WHERE o.type='DD'
    AND o.docType='obs'
    AND o.subset='METAR'
    AND o.version='V01'
    AND m0.type='DD'
    AND m0.docType='model'
    AND m0.subset='METAR'
    AND m0.version='V01'
    AND m0.model='RAP_OPS_130'
    AND m0.fcstLen = 6
    AND o.fcstValidEpoch >= 1668272400
    AND o.fcstValidEpoch <= 1670864400
    AND m0.fcstValidEpoch >= 1668272400
    AND m0.fcstValidEpoch <= 1670864400
    AND m0.fcstValidEpoch = o.fcstValidEpoch
    AND m0data.name IN ['AGGH','AGGL','AYMH','AYMO']
    AND odata.name IN ['AGGH','AGGL','AYMH','AYMO']
    AND m0data.name = odata.name
GROUP BY m0.fcstValidEpoch%(24*3600)/3600
ORDER BY hr_of_day;
