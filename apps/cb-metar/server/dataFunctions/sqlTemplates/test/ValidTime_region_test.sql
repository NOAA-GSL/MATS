SELECT m0.fcstValidEpoch%(24*3600)/3600 AS hr_of_day,
       COUNT(DISTINCT m0.fcstValidEpoch) nTimes,
       MIN(m0.fcstValidEpoch) min_secs,
       MAX(m0.fcstValidEpoch) max_secs,
       SUM(m0.data.['500.0'].hits) hit,
       SUM(m0.data.['500.0'].false_alarms) fa,
       SUM(m0.data.['500.0'].misses) miss,
       SUM(m0.data.['500.0'].correct_negatives) cn,
       ARRAY_SORT(ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['500.0'].hits) || ';' || TO_STRING(m0.data.['500.0'].false_alarms) || ';' || TO_STRING(m0.data.['500.0'].misses) || ';' || TO_STRING(m0.data.['500.0'].correct_negatives))) sub_data,
       COUNT(m0.data.['500.0'].hits) n0
FROM vxdata._default.METAR m0
WHERE m0.type='DD'
    AND m0.docType='CTC'
    AND m0.subset='METAR'
    AND m0.version='V01'
    AND m0.model='HRRR_OPS'
    AND m0.region='ALL_HRRR'
    AND m0.fcstLen = 6
    AND m0.fcstValidEpoch >= 1668272400
    AND m0.fcstValidEpoch <= 1670864400
GROUP BY m0.fcstValidEpoch%(24*3600)/3600
ORDER BY hr_of_day;
