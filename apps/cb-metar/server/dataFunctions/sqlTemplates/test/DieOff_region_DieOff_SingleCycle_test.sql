SELECT m0.fcstLen AS fcst_lead,
       COUNT(DISTINCT m0.fcstValidEpoch) N_times,
       MIN(m0.fcstValidEpoch) min_secs,
       MAX(m0.fcstValidEpoch) max_secs,
       SUM(m0.data.['500.0'].hits) hit,
       SUM(m0.data.['500.0'].false_alarms) fa,
       SUM(m0.data.['500.0'].misses) miss,
       SUM(m0.data.['500.0'].correct_negatives) cn,
       ARRAY_SORT(ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['500.0'].hits) || ';' || TO_STRING(m0.data.['500.0'].false_alarms) || ';' || TO_STRING(m0.data.['500.0'].misses) || ';' || TO_STRING(m0.data.['500.0'].correct_negatives))) sub_data,
       COUNT(m0.data.['500.0'].hits) N0
FROM vxdata._default.METAR m0
WHERE m0.type='DD'
    AND m0.docType='CTC'
    AND m0.subset='METAR'
    AND m0.version='V01'
    AND m0.model='RAP_OPS_130'
    AND m0.region='ALL_HRRR'
    AND m0.fcstLen IN [0,3,6,9,12,15,18,21,24,30,36,42,48]
    AND m0.fcstValidEpoch-m0.fcstLen*3600 = 1668272400
GROUP BY m0.fcstLen
ORDER BY fcst_lead;
