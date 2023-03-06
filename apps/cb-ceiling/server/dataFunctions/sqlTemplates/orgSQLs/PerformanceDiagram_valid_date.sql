SELECT m0.fcstValidEpoch AS binVal,
       COUNT(DISTINCT m0.fcstValidEpoch) N_times,
       MIN(m0.fcstValidEpoch) min_secs,
       MAX(m0.fcstValidEpoch) max_secs,
       ((SUM(m0.data.['500.0'].hits))/SUM(m0.data.['500.0'].hits+m0.data.['500.0'].misses)) AS pod,
       ((SUM(m0.data.['500.0'].false_alarms))/SUM(m0.data.['500.0'].false_alarms+m0.data.['500.0'].hits)) AS far,
       SUM(m0.data.['500.0'].hits+m0.data.['500.0'].misses) AS oy_all,
       SUM(m0.data.['500.0'].false_alarms+m0.data.['500.0'].correct_negatives) AS on_all,
       ARRAY_SORT(ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['500.0'].hits) || ';' || TO_STRING(m0.data.['500.0'].false_alarms) || ';' || TO_STRING(m0.data.['500.0'].misses) || ';' || TO_STRING(m0.data.['500.0'].correct_negatives))) sub_data,
       COUNT(m0.data.['500.0'].hits) N0
FROM vxdata._default.METAR m0
WHERE m0.type='DD'
    AND m0.docType='CTC'
    AND m0.subset='METAR'
    AND m0.version='V01'
    AND m0.model='HRRR_OPS'
    AND m0.region='E_HRRR'
    AND m0.fcstValidEpoch >= 1668272400
    AND m0.fcstValidEpoch <= 1670864400
    AND m0.fcstValidEpoch%(24*3600)/3600 IN[2,4,5]
    AND m0.fcstLen = 6
GROUP BY m0.fcstValidEpoch
ORDER BY binVal;