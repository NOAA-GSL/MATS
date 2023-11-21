SELECT m0.fcstLen AS fcst_lead,
       COUNT(DISTINCT m0.fcstValidEpoch) N_times,
       MIN(m0.fcstValidEpoch) min_secs,
       MAX(m0.fcstValidEpoch) max_secs,
       {{vxSTATISTIC}}
FROM {{vxDBTARGET}} m0
WHERE m0.type = 'DD'
    AND m0.docType = '{{vxTYPE}}'
    AND m0.subDocType = '{{vxVARIABLE}}'
    AND m0.subset = 'METAR'
    AND m0.version = 'V01'
    AND m0.model = '{{vxMODEL}}'
    AND m0.region = '{{vxREGION}}'
    AND m0.fcstLen IN [0,3,6,9,12,15,18,21,24,30,36,42,48]
    AND (m0.fcstValidEpoch - m0.fcstLen * 3600) %(24 * 3600) / 3600 IN [{{vxUTC_CYCLE_START}}]
    AND m0.fcstValidEpoch - m0.fcstLen * 3600 >= {{vxFROM_SECS}}
    AND m0.fcstValidEpoch - m0.fcstLen * 3600 <= {{vxTO_SECS}}
GROUP BY m0.fcstLen
ORDER BY fcst_lead;
