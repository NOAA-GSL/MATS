SELECT m0.fcstValidEpoch AS avtime,
       COUNT(DISTINCT m0.fcstValidEpoch) N_times,
       MIN(m0.fcstValidEpoch) min_secs,
       MAX(m0.fcstValidEpoch) max_secs,
       SUM(m0.data.['{{vxTHRESHOLD}}'].hits) hit,
       SUM(m0.data.['{{vxTHRESHOLD}}'].false_alarms) fa,
       SUM(m0.data.['{{vxTHRESHOLD}}'].misses) miss,
       SUM(m0.data.['{{vxTHRESHOLD}}'].correct_negatives) cn,
       ARRAY_SORT(ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['{{vxTHRESHOLD}}'].hits) || ';' || TO_STRING(m0.data.['{{vxTHRESHOLD}}'].false_alarms) || ';' || TO_STRING(m0.data.['{{vxTHRESHOLD}}'].misses) || ';' || TO_STRING(m0.data.['{{vxTHRESHOLD}}'].correct_negatives))) sub_data,
       COUNT(m0.data.['{{vxTHRESHOLD}}'].hits) N0
FROM {{vxDBTARGET}} m0
WHERE m0.type='DD'
    AND m0.docType='CTC'
    AND m0.subset='METAR'
    AND m0.version='V01'
    AND m0.model='{{vxMODEL}}'
    AND m0.region='{{vxREGION}}'
    AND m0.fcstValidEpoch >= 1668272400
    AND m0.fcstValidEpoch <= 1670864400
    AND m0.fcstValidEpoch%(24*3600)/3600 IN[{{vxVALID_TIMES}}]
    AND m0.fcstLen = {{vxFCST_LEN}}
GROUP BY m0.fcstValidEpoch
ORDER BY avtime;
