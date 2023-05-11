SELECT
    fcstValidEpoch fve,
    {{vxAVERAGE}} avtime,
    {{stationNamesList}}
FROM
    `vxdata`._default.METAR AS models
WHERE
    type = "DD"
    AND docType = "model"
    AND model = {{vxMODEL}}
    AND fcstLen = {{vxFCST_LEN}}
    AND version = "V01"
    AND fcstValidEpoch IN {{fcstValidEpoch}}