SELECT m0.fcstValidEpoch AS avtime,
       COUNT(DISTINCT m0.fcstValidEpoch) nTimes,
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
    AND m0.fcstLen < 24
    AND (m0.fcstValidEpoch - m0.fcstLen * 3600) %(24 * 3600) / 3600 IN [{{vxUTC_CYCLE_START}}]
    AND m0.fcstValidEpoch >= {{vxFROM_SECS}}
    AND m0.fcstValidEpoch <= {{vxTO_SECS}}
GROUP BY m0.fcstValidEpoch
ORDER BY avtime;
